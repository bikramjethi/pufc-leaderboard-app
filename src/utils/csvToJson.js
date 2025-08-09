// Utility to convert CSV string to JSON array
export function csvToJson(csvString) {
  const lines = csvString.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    let obj = {};
    headers.forEach((header, idx) => {
      const key = header.trim();
      const value = values[idx].trim();
      obj[key] = isNaN(value) ? value : Number(value);
    });
    return obj;
  });
}

// Example usage:
// const csv = `name,position,wins,losses,draws,cleanSheets,goals,hatTricks
// John Smith,FWD,10,5,5,3,18,2
// Jane Doe,GK,14,4,4,10,2,0`;
// const data = csvToJson(csv);
// console.log(data);
