// src/utils/googleSheets.js

import { gapi } from 'gapi-script';

const SHEET_ID = "YOUR_SHEET_ID";
const API_KEY = "YOUR_API_KEY";

export async function fetchAccountFromGoogleSheet() {
  return new Promise((resolve, reject) => {
    gapi.load("client", async () => {
      try {
        await gapi.client.init({
          apiKey: process.env.REACT_APP_GOOGLESHEET_API,
          discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        });
        
        const response = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: "Sheet1!A1:A10", // 根据需要调整范围
        });
        
        const addresses = response.result.values?.flat();
        resolve(addresses[0]); // 返回第一个地址
      } catch (error) {
        console.error("Error fetching data from Google Sheets:", error);
        reject(error);
      }
    });
  });
}
