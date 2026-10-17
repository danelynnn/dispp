import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";
import tls from "node:tls";

import XMLParser from "@nodable/flexible-xml-parser";
import { promisify } from "node:util";
const parser = new XMLParser({ autoClose: "html", skip: { attributes: false } });

class XMPPStream {
  constructor(domain, username, out = "out.xml") {
    this.domain = domain;
    this.username = username;
    this.onReceive = () => {};

    this.out = fs.createWriteStream(out);
  }

  #connect(callback) {
    console.log("step 1.1: determining IP address and port at which to connect");

    const query = `_xmpp-client._tcp.${this.domain}`;
    console.log("constructing DNS SRV query:", query);

    dns.resolveSrv(query, (err, addresses) => {
      const address = addresses[0];
      console.log("resolving fqdn", address);

      dns.resolve(address.name, (err, records) => {
        const ip = records[0];
        console.log("found ip", ip);

        this.#openTCPConnection(address.port, ip, callback);
      });
    });
  }
  connect = promisify(this.#connect);

  #authenticate(header, password, callback) {
    console.log("step 1.5: authenticating with SASL");
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
          const credentials = Buffer.from(`\0${this.username}\0${password}`).toString("base64");
          this.socket.write(`
            <auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'
              mechanism='${mech}'>${credentials}</auth>
          `);

          this.socket.once("data", (data) => this.#postSASLNegotiate(data.toString(), callback));
        }
      }
    }
  }
  authenticate = promisify(this.#authenticate);

  #retrieveRoster(callback) {
    console.log("step 2.1: retrieving roster");
    this.socket.write(`
      <iq from='${this.resourcepart}'
          id='70'
          type='get'>
        <query xmlns='jabber:iq:roster'/>
      </iq>
    `);
    this.socket.once("data", (data) => this.#receiveRoster(data.toString(), callback));
  }
  retrieveRoster = promisify(this.#retrieveRoster);

  #collectStanzaPages(callback) {
    let stanza = "";

    this.socket.on("data", (data) => {
      this.out.write(data);
      this.out.write("\n\n\n");
      stanza += data;

      const response = parser.parse(data);
      if ("iq" in response && "fin" in response["iq"]) {
        this.socket.removeAllListeners();
        callback(stanza);
      }
    });
  }
  #requestArchive(jid, callback) {
    this.socket.write(`
      <iq type='set' id='${this.username}'>
        <query xmlns='urn:xmpp:mam:2'>
          <x xmlns='jabber:x:data' type='submit'>
            <field var='FORM_TYPE' type='hidden'>
              <value>urn:xmpp:mam:2</value>
            </field>
            <field var='with'>
              <value>${jid}</value>
            </field>
            <set xmlns='http://jabber.org/protocol/rsm'>
              <max>3</max>
            </set>
          </x>
        </query>
      </iq>
    `);

    this.socket.removeAllListeners("data");
    this.#collectStanzaPages((stanza) => {
      const response = parser.parse(stanza);

      callback(
        null,
        response["message"].map((message) => message["result"]["forwarded"]["message"]),
      );
      this.socket.on("data", (data) => this.#receiveData(data.toString()));
    });
  }
  requestArchive = promisify(this.#requestArchive);

  sendMessage(to, body) {
    this.socket.write(`
      <message to='${to}'>
        <body>${body}</body>
        <img src="https://miro.medium.com/1*gGzjds6d329U8umqHI0nKQ.jpeg"></img>
      </message>
    `);
  }

  #openTCPConnection(port, ip, callback) {
    console.log("step 1.2: starting TCP connection", port, ip);
    this.socket = net.createConnection(port, ip);

    this.socket.on("connect", () => {
      console.log("step 1.3: sending initial stream header");
      this.socket.write(`
        <stream:stream
          from='${this.username}@${this.domain}'
          to='${this.domain}'
          version='1.0'
          xml:lang='en'
          xmlns='jabber:client'
          xmlns:stream='http://etherx.jabber.org/streams'>
      `);
    });

    this.socket.once("data", (data) => this.#postInitialHeader(data.toString(), callback));
  }

  #postInitialHeader(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("stream:error" in response) {
      console.log("stream ended :c bye");
    } else if ("stream:stream" in response && "stream:features" in response["stream:stream"]) {
      const features = response["stream:stream"]["stream:features"];

      if ("starttls" in features) {
        console.log("step 1.4: negotiating TLS");
        this.socket.write(`
          <starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls' />
        `);
        this.socket.once("data", (data) => this.#postTLSNegotiate(data.toString(), callback));
      }
    }
  }

  #postTLSNegotiate(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("proceed" in response) {
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
            from='${this.username}@${this.domain}'
            to='${this.domain}'
            version='1.0'
            xml:lang='en'
            xmlns='jabber:client'
            xmlns:stream='http://etherx.jabber.org/streams'>
        `);
      });
      this.socket.once("data", (data) => {
        this.out.write(data);
        this.out.write("\n\n\n");

        callback(null, parser.parse(data.toString()));
      });
    }
  }

  #postSASLNegotiate(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("success" in response) {
      console.log("sending initial stream header (yet again)");
      this.socket.write(`
        <stream:stream
          from='${this.username}@${this.domain}'
          to='${this.domain}'
          version='1.0'
          xml:lang='en'
          xmlns='jabber:client'
          xmlns:stream='http://etherx.jabber.org/streams'>
      `);

      this.socket.once("data", (data) => this.#postAuthenticate(data.toString(), callback));
    } else if ("failure" in response) {
      callback("invalid login", null);
    }
  }

  #postAuthenticate(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("stream:stream" in response && "stream:features" in response["stream:stream"]) {
      const features = response["stream:stream"]["stream:features"];

      if ("bind" in features) {
        console.log("step 1.6: binding a resource to stream");
        // requesting resourcepart
        console.log("requesting resourcepart");
        this.socket.write(`
          <iq id='69' type='set'>
            <bind xmlns="urn:ietf:params:xml:ns:xmpp-bind" />
          </iq>
        `);

        this.socket.once("data", (data) => this.#receiveResourcepart(data, callback));
      }
    }
  }

  #receiveResourcepart(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);
    this.resourcepart = response["iq"]["bind"]["jid"];

    callback(null, this.resourcepart);
  }

  #receiveRoster(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);

    if ("error" in response["iq"]["query"]) {
      console.log("no roster found :c");
    } else {
      if ("item" in response["iq"]["query"]) {
        const roster = response["iq"]["query"]["item"];
        if (Array.isArray(roster)) {
          this.roster = roster;
        } else {
          this.roster = [roster];
        }
      } else {
        this.roster = [];
      }

      console.log("step 2.2: broadcasting initial presence");
      this.socket.write(`<presence />`);
      this.socket.once("data", (data) => this.#postInitialPresence(data.toString(), callback));
    }
  }

  #postInitialPresence(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);
    this.socket.on("data", (data) => this.#receiveData(data.toString()));
    callback(null, response["presence"]);
  }

  #receiveArchive(data, callback) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);
    callback(null, response);
  }

  // catch-all for any server updates
  // TODO:
  // - receive incoming initial presence
  // - receive incoming roster updates
  // - receive incoming messages
  #receiveData(data) {
    this.out.write(data);
    this.out.write("\n\n\n");

    const response = parser.parse(data);
    this.onReceive(response);
  }
}

export default XMPPStream;
