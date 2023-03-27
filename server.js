const express = require("express");
const app = express();
const { google } = require("googleapis");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

//#region ----------------INIT--------------------------

app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: "*",
    headers: "*",
  })
);
app.use(express.json());

const client_id =
  "37664464621-veaesqle7echbvvjqkqr2412isgdoa1h.apps.googleusercontent.com";
const client_secret = "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";

const key = "AIzaSyAExsadbuHCgyxzjac3NnQAdzy_xMdgEgM";
const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
];
const oauth = new google.auth.OAuth2(
  "37664464621-veaesqle7echbvvjqkqr2412isgdoa1h.apps.googleusercontent.com",
  "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",
  "http://localhost:8888/oauth/callback"
);

let token;
let drive;

init();

async function init() {
  try {
    token = JSON.parse(fs.readFileSync(__dirname + "/token.json", "utf8"));
  } catch (err) {
    return console.log("yo a err");
  }

  if (Date.now() - token["expiry_date"] < 1) {
    let ax = await axios.post("https://www.googleapis.com/oauth2/v4/token", {
      client_id: client_id,
      client_secret: client_secret,
      refresh_token: token["refresh_token"],
      grant_type: "refresh_token",
    });
    token["access_token"] = ax["data"]["access_token"];
		//console.log(token);
  }

  oauth.setCredentials({
    access_token: token["access_token"],
    refresh_token: token["refresh_token"],
    key: key,
  });

  drive = google.drive({ version: "v3", auth: oauth });
}

//#endregion

//#region -------------------- Functions -----------------

function main(options) {
  switch (options.method) {
    case value:
      break;

    default:
      break;
  }
}

async function DeleteFiles(arr) {
  for (let i = 0; i < arr.length; i++) {
    const { id } = arr[i];
    drive.files.delete({ fileId: id });
  }
}

async function DownloadFiles(json) {
  json["path"] ||= __dirname;
  const { path, files } = json;
  for (let i = 0; i < files.length; i++) {
    let { name, id } = files[i];

    const destStream = fs.createWriteStream(path + "/" + name);
    await drive.files
      .get({ fileId: id, alt: "media" }, { responseType: "stream" })
      .then((response) => {
        response.data.pipe(destStream);

        destStream.on("error", (err) => {
          console.error(err);
        });

        destStream.on("finish", () => {
          console.log(`${name} saved to ${path}`);
        });
      });
  }
}

//#endregion

//#region -------------------- ROUTES -----------------

app.get("/hasToken", (req, res) => {
  if (token) res.sendStatus(200);
  else res.sendStatus(405);
});

app.get("/signOut", (req, res) => {
  token = null;
  res.end();
});

app.get("/listFiles", async (req, res) => {
  try {
    const response = await drive.files.list({
      pageSize: 20,
      fields: "nextPageToken, files(id, name)",
    });

    const files = response.data.files;
    if (files.length === 0) {
      console.log("No files found.");
      return;
    }

    res.json({ files: files });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err: err });
  }
});

// app.post("/download", async (req, res) => {
//   try {
//     const query =
//       "name='mcd001.ps2' or name='mcd002.ps2' and mimeType!='application/vnd.google-apps.folder' and trashed = false";
//     drive.files
//       .list({ q: query, fields: "files(id, name)" })
//       .then(async (res2) => {
//         const files = res2.data.files.map((el) => {
//           return { name: el.name, id: el.id };
//         });
//         console.log(files);
//         for (let i = 0; i < files.length; i++) {
//           await DownloadFile(
//             files[i].name,
//             files[i].id,
//             "C:/Users/Lemond Wyatt/Documents/PCSX2/memcards"
//           );
//         }
//       })
//       .catch((err) => {
//         console.error(err);
//       });

//     res.status(200);
//   } catch (err) {
//     console.log(err);
//     res.send("bye :(");
//   }
// });

app.post("/main", (req, res) => {
  let { method, files, path } = req.body;
  switch (method) {
    case "delete":
      DeleteFiles(files);
      res.status(200).json({ response: "files deleted" });
      break;

    case "download":
      DownloadFiles(req.body);
      res.status(200).json({ response: "files saved to " + path });
      break;

    default:
  		res.status(400).json({status: 'bad request'});
      break;
  }

});

app.get("/oauth", async (req, res) => {
  const authorizationUrl = oauth.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    scope: SCOPES,
    include_granted_scopes: true,
  });

  console.log("sent");
  res.json({ location: authorizationUrl });
});

app.get("/oauth/callback", async (req, res) => {
  const response = await oauth.getToken(req.query.code);
  token = response["tokens"];
  console.log(token);
  console.log(`lasts for ${token["expiry_date"] - Date.now()}`);

  oauth.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    key: key,
  });

  drive = google.drive({ version: "v3", auth: oauth });

  fs.writeFileSync(__dirname + "/token.json", JSON.stringify(token));

  res.redirect("http://localhost:5173/");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/./index.html");
});

let port = 8888;
app.listen(port, null, () => console.log("port running on " + port));

//#endregion
