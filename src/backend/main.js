import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import fs from "node:fs";
import { promisify } from "node:util";
import { create, convert } from "xmlbuilder2";
import * as readline from "node:readline";

function input(socket) {
  rl.question("chat: ", (answer) => {
    var stanza = create({ version: "1.0" })
      .ele("message", { to: "unrealapex@disroot.org" })
      .ele("body")
      .txt(answer)
      .up()
      .toString();

    console.log(stanza);
    socket.write(stanza);
    input(socket);
  });
}

function receiveData(data) {
  console.log("server said", data);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const resolveSrv = promisify(dns.resolveSrv);
const resolve = promisify(dns.resolve);

var stream = fs.createWriteStream("log.xml");

// step 1: determine the IP address and port at which to connect
// step 1.0: construct DNS SRV query for FQDN
var address;
var ip;
console.log("step 1.1: sending DNS SRV query for FQDN");
await resolveSrv("_xmpp-client._tcp.worlio.com")
  // step 1.1: resolve FQDN into IPv4 address
  .then((addresses) => {
    address = addresses[0];
    console.log("step 1.2: resolving FQDN", address);
    return resolve(address.name);
  })
  .then((records) => {
    ip = records[0];
    console.log("found IP", ip);
  });

// step 2: open TCP connection
console.log("step 2: starting TCP connection to port", address.port);
var socket = net.createConnection(address.port, ip);

// step 3: open XML stream over TCP
console.log("step 3: sending initial stream header");
var initialStreamHeader = create({ version: "1.0" })
  .ele("stream:stream", {
    from: "danelyn@worlio.com",
    to: "worlio.com",
    version: "1.0",
    "xml:lang": "en",
    xmlns: "jabber:client",
    "xmlns:stream": "http://etherx.jabber.org/streams",
  })
  .toString();
initialStreamHeader = initialStreamHeader.replace("/>", ">");
socket.write(initialStreamHeader);

socket.on("data", (data) => {
  stream.write(data.toString());
  stream.write("\n\n\n");

  const response = convert(data.toString(), { format: "object" });

  if (Object.keys(response).includes("stream:error")) {
    console.log("stream ended :c bye");
    return;
  }

  // received a stream header
  if (response["stream:stream"]) {
    const features = response["stream:stream"]?.["stream:features"];

    if (features) {
      if (features["starttls"]) {
        // step 4.0: negotiate TLS for channel encryption
        console.log("step 4.0: negotiating TLS");
        const negotiate = create({ version: "1.0" }).ele("starttls", {
          xmlns: "urn:ietf:params:xml:ns:xmpp-tls",
        });
        socket.write(negotiate.toString());
      }
    }
  } else if (response["proceed"]) {
    // step 4.1: initiate TLS negotiation
    console.log("step 4.1: initiating TLS");
    socket = tls.connect({
      socket: socket,
      secureContext: tls.createSecureContext({
        key: fs.readFileSync("allie-key.pem"),
        cert: fs.readFileSync("allie-cert.pem"),
      }),
      rejectUnauthorized: false,
    });

    socket.on("secureConnect", function () {
      var initialStreamHeader = create({ version: "1.0" })
        .ele("stream:stream", {
          from: "danelyn@worlio.com",
          to: "worlio.com",
          version: "1.0",
          "xml:lang": "en",
          xmlns: "jabber:client",
          "xmlns:stream": "http://etherx.jabber.org/streams",
        })
        .toString();
      initialStreamHeader = initialStreamHeader.replace("/>", ">");
      socket.write(initialStreamHeader);

      var mechanism;
      var jid;

      socket.on("data", (data) => {
        stream.write(data.toString());
        stream.write("\n\n\n");
        const response = convert(data.toString(), { format: "object" });

        if (Object.keys(response).includes("stream:error")) {
          console.log("stream ended :c bye");
          return;
        }

        if (response["stream:stream"]) {
          const features = response["stream:stream"]?.["stream:features"];

          if (features) {
            if (features["mechanisms"]) {
              console.log("step 5: authenticating SASL mechanisms");
              const mechanisms = features["mechanisms"]["mechanism"];

              if (Array.isArray(mechanisms)) {
                for (mech in mechanisms) {
                  // pass
                }
              } else {
                mechanism = mechanisms;
                const negotiate = create({ version: "1.0" })
                  .ele("auth", {
                    xmlns: "urn:ietf:params:xml:ns:xmpp-sasl",
                    mechanism: mechanisms,
                  })
                  .txt(
                    Buffer.from(`\0danelyn\0pagUe*GXn5?A3&'`).toString(
                      "base64",
                    ),
                  )
                  .toString();
                socket.write(negotiate);
              }
            } else if (features["bind"]) {
              // step 6: bind a resource to the stream
              // requesting resourcepart
              console.log("step 6.1: requesting resourcepart");
              var request = create({ version: "1.0" })
                .ele("iq", { id: "69", type: "set" })
                .ele("bind", { xmlns: "urn:ietf:params:xml:ns:xmpp-bind" })
                .up()
                .toString();
              socket.write(request);
            }
          }
        } else if (response["challenge"]) {
          console.log(response);
        } else if (response["success"]) {
          var initialStreamHeader = create({ version: "1.0" })
            .ele("stream:stream", {
              from: "danelyn@worlio.com",
              to: "worlio.com",
              version: "1.0",
              "xml:lang": "en",
              xmlns: "jabber:client",
              "xmlns:stream": "http://etherx.jabber.org/streams",
            })
            .toString();
          initialStreamHeader = initialStreamHeader.replace("/>", ">");
          socket.write(initialStreamHeader);
        } else if (response["iq"]) {
          if (response["iq"]["@type"] == "result") {
            if (response["iq"]["@id"] == 69) {
              jid = response["iq"]["bind"]["jid"];
              console.log(jid);

              // replace data listener to send externally
              socket.on("data", receiveData);
              input(socket);
            }
          }
        }
      });
    });
  }
});
socket.on("error", (err) => {
  console.log(err);
});
socket.on("end", () => {
  console.log("stream ended :c bye");
});

// socket.write("</stream:stream>");

export { input, socket };
