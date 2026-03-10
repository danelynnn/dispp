import dns from "node:dns";
import net from "node:net";
import tls from "node:tls";
import fs from "node:fs";
import { promisify } from "node:util";
import { create, convert } from "xmlbuilder2";

async function connect() {
  const resolveSrv = promisify(dns.resolveSrv);
  const resolve = promisify(dns.resolve);

  var stream = fs.createWriteStream("log.xml");

  // step 1: determine the IP address and port at which to connect
  // step 1.0: construct DNS SRV query for FQDN
  var address;
  var ip;
  await resolveSrv("_xmpp-client._tcp.worlio.com")
    // step 1.1: resolve FQDN into IPv4 address
    .then((addresses) => {
      address = addresses[0];
      return resolve(address.name);
    })
    .then((records) => {
      ip = records[0];
    });

  // step 2: open TCP connection
  var socket = net.createConnection(address.port, ip);

  // step 3: open XML stream over TCP
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

    if (Object.keys(response).includes("stream:stream")) {
      const stream = response["stream:stream"];

      if (Object.keys(stream).includes("stream:features")) {
        const features = stream["stream:features"];

        if (Object.keys(features).includes("starttls")) {
          // step 4.0: negotiate TLS for channel encryption
          const negotiate = create({ version: "1.0" }).ele("starttls", {
            xmlns: "urn:ietf:params:xml:ns:xmpp-tls",
          });
          socket.write(negotiate.toString());
        }
      }
    } else if (Object.keys(response).includes("proceed")) {
      // step 4.1: initiate TLS negotiation
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

        socket.on("data", (data) => {
          const response = convert(data.toString(), { format: "object" });
          stream.write(data.toString());
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
}

connect();
