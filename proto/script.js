function Record() {
    this.type = null;
    this.amount = 0;
    this.isUser = false;
};

function Result() {
    this.autoStartCount = 0;
    this.autoEndCount = 0;
    this.debitCount = 0;
    this.creditCount = 0;
    
    this.debitSum = 0;
    this.creditSum = 0;
    this.userBalance = 0;
    
    this.offset = 0;
};

var dataFile = document.getElementById('dataFile');

dataFile.addEventListener('change', function(e) {
    var file = dataFile.files[0];
    var reader = new FileReader();
    var buffer;
    
    reader.addEventListener('load', function(e) {
        buffer = e.target.result;
        var dv = new DataView(buffer);
        var results = new Result();
        
        // Header row
        results.offset = 5;
        
        var numOfRecords = dv.getUint32(results.offset);
        results.offset += 4;
        
        // Loop through data rows
        for (var i = 0; i < numOfRecords; i++) {
            var currentRecord = getRecord(dv, results.offset);
            results = tallyResults(results, currentRecord);
        }
        
        displayResults(results);
    });
    
    reader.readAsArrayBuffer(file);
});

/*
    results - Result object
    currentRecord - Record object
    
    returns: Result object
*/
function tallyResults(results, currentRecord) {
    switch (currentRecord.type) {
        case 0: // Debit
            results.debitSum += currentRecord.amount;
            if (currentRecord.isUser) {
                results.userBalance -= currentRecord.amount;
            }
            results.debitCount++;
            results.offset += 21;
            break;
        case 1: // Credit
            results.creditSum += currentRecord.amount;
            if (currentRecord.isUser) {
                results.userBalance += currentRecord.amount;
            }
            results.creditCount++;
            results.offset += 21
            break;
        case 2: // Start Autopay
            results.autoStartCount++;
            results.offset += 13;
            break;
        case 3: // End Autopay
            results.autoEndCount++;
            results.offset += 13;
            break;
        default:
            // error
            return null;
    }
    
    return results;
}

/*
    dv - DataView
    offset - int
    
    returns: Record object
*/
function getRecord(dv, offset) {
    var record = new Record();
    var idOffset = offset + 5;
    var amountOffset = offset + 13;
    
    // Get Type
    record.type = dv.getUint8(offset);
    
    if (record.type == 0 || record.type == 1) {
        record.amount = dv.getFloat64(amountOffset);
    }
    
    // Check UserID
    // javascript doesn't handle uint64 natively, as a workaround to get this working,
    // i converted the userID number to binary with an online calculator.
    // normally, i'd try to use a js library that implements uint64.
    var userIdBinary = "0010001000011000110011000111000101100110101010000011100110000111";
    var userIdPart1 = padZeros(dv.getUint32(idOffset).toString(2), 32);
    var userIdPart2 = padZeros(dv.getUint32(idOffset + 4).toString(2), 32);
    
    var userIdCombined = userIdPart1 + userIdPart2;
    if (userIdCombined == userIdBinary) {
        record.isUser = true;
    }
    
    return record;
}

/*
    value - string
    length - int
    
    returns: string
*/
function padZeros(value, length) {
    var result = value;
    
    while (result.length < length) {
        result = "0" + result;
    }
    return result;
}

/*
    results - Result object
*/
function displayResults(results) {
    document.getElementById('displayResults').innerHTML +=
        "Total Amount of Debits: $" + results.debitSum.toString() + "<br>" + 
        "Total Amount of Credits: $" + results.creditSum.toString() + "<br>" + 
        "Autopays Started: " + results.autoStartCount.toString() + "<br>" + 
        "Autopays Ended: " + results.autoEndCount.toString() + "<br>" + 
        "Balance for UserID 2456938384156277127: $" + results.userBalance.toString() + "<br>";
        
    document.getElementById('displayResults').innerHTML += 'Debit count: ' + results.debitCount + '<br>';
    document.getElementById('displayResults').innerHTML += 'Credit count: ' + results.creditCount;
}

/************ 
    Tests
*************/

document.getElementById('runTests').addEventListener('click', function() {
   var testResult = "";
   
   // Test padZeros
   var expectPad = "00000101";
   var testPad = padZeros("101", 8);
   if (testPad == expectPad) {
       testResult += "padZero passed - ";
   } else {
       testResult += "padZero failed - ";
   }
   testResult += "Expected " + expectPad + ", Got " + testPad + "<br>";
   
   var res = new Result();
   var rec = new Record();
   var testTally;
   
   // Test debit case
   rec.type = 0;
   rec.amount = 5;
   testTally = tallyResults(res, rec);
   if (testTally.debitCount == 1 && testTally.debitSum == 5) {
       testResult += "Debit tally test passed - ";
   } else {
       testResult += "Debit tally test failed - ";
   }
   testResult += "Expected 5, Got: " + testTally.debitSum + "<br>";
   
   // Test credit case
   rec.type = 1;
   testTally = tallyResults(res, rec);
   if (testTally.creditCount == 1 && testTally.creditSum == 5) {
       testResult += "Credit tally test passed - ";
   } else {
       testResult += "Credit tally test failed - ";
   }
   testResult += "Expected 5, Got: " + testTally.creditSum + "<br>";
   
   // Test start autopay case
   rec.amount = 0;
   rec.type = 2;
   testTally = tallyResults(res, rec);
   if (testTally.autoStartCount == 1) {
       testResult += "Start Autopay tally test passed - ";
   } else {
       testResult += "Start Autopay tally test failed - ";
   }
   testResult += "Expected 1, Got: " + testTally.autoStartCount + "<br>";
   
   // Test end autopay case
   rec.type = 3;
   testTally = tallyResults(res, rec);
   if (testTally.autoEndCount == 1) {
       testResult += "End Autopay tally test passed - ";
   } else {
       testResult += "End Autopay tally test failed - ";
   }
   testResult += "Expected 1, Got: " + testTally.autoEndCount + "<br>";
   
   // Test incorrect type case
   rec.type = 4;
   testTally = tallyResults(res, rec);
   if (testTally == null) {
       testResult += "Incorrect type test passed - is null";
   } else {
       testResult += "Incorrect type test failed - is not null";
   }
   
   // Test for getRecord
   // manually create a data row to specifications and run the DataView through getRecord
   
   document.getElementById('testResults').innerHTML = testResult;
});
