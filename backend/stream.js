import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";
import tls from "node:tls";

import XMLParser from "@nodable/flexible-xml-parser";
const parser = new XMLParser({ autoClose: "html" });

class XMPPStream {
  constructor(domain, onConnect, data, out = "log.xml") {
    this.onConnect = onConnect;
    this.data = data;

    this.out = fs.createWriteStream(out);
    console.log("step 1: determining IP address and port at which to connect");

    const query = `_xmpp-client._tcp.${domain}`;
    console.log("constructing DNS SRV query:", query);

    dns.resolveSrv(`_xmpp-client._tcp.${domain}`, (err, addresses) => {
      const address = addresses[0];
      console.log("resolving fqdn", address);

      dns.resolve(address.name, (err, records) => {
        const ip = records[0];
        console.log("found ip", ip);

        this.#openTCPConnection(address.port, ip);
      });
    });
  }

  sendMessage(to, body) {
    this.socket.write(`
      <message to='${to}'>
        <body>${body}</body>
      </message>
    `);
  }

  #openTCPConnection(port, ip) {
    console.log("step 2: starting TCP connection", port, ip);
    this.socket = net.createConnection(port, ip);

    this.socket.on("connect", () => {
      console.log("step 3: sending initial stream header");
      this.socket.write(`
        <stream:stream
          from='danelyn@worlio.com'
          to='worlio.com'
          version='1.0'
          xml:lang='en'
          xmlns='jabber:client'
          xmlns:stream='http://etherx.jabber.org/streams'>
      `);
    });

    this.socket.once("data", (data) => this.#postInitialHeader(data.toString()));
  }

  #postInitialHeader(data) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("stream:error" in response) {
      console.log("stream ended :c bye");
    } else if ("stream:stream" in response && "stream:features" in response["stream:stream"]) {
      const features = response["stream:stream"]["stream:features"];

      if ("starttls" in features) {
        console.log("step 4: negotiating TLS");
        this.socket.write(`
          <starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls' />
        `);
        this.socket.once("data", (data) => this.#postTLSNegotiate(data.toString()));
      }
    }
  }

  #postTLSNegotiate(data) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("proceed" in response) {
      this.openSecureConnection();
    }
  }

  openSecureConnection() {
    console.log("starting TLS connection");
    this.socket = tls.connect({
      socket: this.socket,
      secureContext: tls.createSecureContext({
        key: fs.readFileSync("allie-key.pem"),
        cert: fs.readFileSync("allie-cert.pem"),
      }),
      rejectUnauthorized: false,
    });

    this.socket.on("secureConnect", () => {
      console.log("sending initial stream header (again)");
      this.socket.write(`
        <stream:stream
          from='danelyn@worlio.com'
          to='worlio.com'
          version='1.0'
          xml:lang='en'
          xmlns='jabber:client'
          xmlns:stream='http://etherx.jabber.org/streams'>
      `);
    });
    this.socket.once("data", (data) => {
      this.out.write(data);
      this.out.write("\n\n\n");

      this.onConnect(parser.parse(data.toString()));
    });
  }

  authenticate(header, username, password) {
    console.log("step 5: authenticate with SASL");
    if ("stream:stream" in header && "stream:features" in header["stream:stream"]) {
      const features = header["stream:stream"]["stream:features"];

      if ("mechanisms" in features) {
        const mechs = features["mechanisms"]["mechanism"];
        if (Array.isArray(mechs)) {
          for (const mech of mechs) {
            console.log("using", mech);
            break;
          }
        } else {
          const mech = mechs;
          console.log("using", mech);
          const credentials = Buffer.from(`\0${username}\0${password}`).toString("base64");
          this.socket.write(`
            <auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'
              mechanism='${mech}'>${credentials}</auth>
          `);

          this.socket.once("data", (data) => this.#postSASLNegotiate(data.toString()));
        }
      }
    }
  }

  #postSASLNegotiate(data) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("success" in response) {
      console.log("sending initial stream header (yet again)");
      this.socket.write(`
        <stream:stream
          from='danelyn@worlio.com'
          to='worlio.com'
          version='1.0'
          xml:lang='en'
          xmlns='jabber:client'
          xmlns:stream='http://etherx.jabber.org/streams'>
      `);

      this.socket.once("data", (data) => this.#postAuthenticate(data.toString()));
    }
  }

  #postAuthenticate(data) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("stream:stream" in response && "stream:features" in response["stream:stream"]) {
      const features = response["stream:stream"]["stream:features"];

      if ("bind" in features) {
        console.log("step 6: binding a resource to stream");
        // requesting resourcepart
        console.log("requesting resourcepart");
        this.socket.write(`
          <iq id='69' type='set'>
            <bind xmlns="urn:ietf:params:xml:ns:xmpp-bind" />
          </iq>
        `);

        this.socket.once("data", (data) => this.#postRequestResourcepart(data));
      }
    }
  }

  #postRequestResourcepart(data) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);
    this.resourcepart = response["iq"]["bind"]["jid"];

    console.log("step 7: exchange an unbounded number of XML stanzas with other entities on the network");
    this.socket.on("data", this.data);
  }
}

export default XMPPStream;
