
const XLSX = require('xlsx');

try {
    const workbook = XLSX.readFile('HedefGlobal_Yenileme.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Get first 20 rows
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, raw: false });

    console.log("--- First 20 Rows ---");
    jsonData.slice(0, 20).forEach((row, index) => {
        console.log(`Row ${index}:`, JSON.stringify(row));
    });

} catch (e) {
    console.error("Error reading file:", e);
}
