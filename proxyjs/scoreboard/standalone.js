// gapi test functions
console.log("Standalone tests loaded");

function gapiTestFilesList()
{
    var folderId = '0B8VRfGThSdoAWUZMNkhzQ3JuMDQ';
    var queryFolder = "'"+ folderId + "' " + "in parents";
    var queryMimeType  = "mimeType = 'application/vnd.google-apps.spreadsheet'";
    var query = queryMimeType + ' and ' +  queryFolder;
    // q: "mimeType = 'application/vnd.google-apps.spreadsheet' and '0B8VRfGThSdoAWUZMNkhzQ3JuMDQ' in parents";
    console.log(query);
    var options = {};
    options.q = query; 

    gapidriveFilesList(options, function(response) {
	console.log('Files:');
	console.log(response);
	var files = response.result.files;
	for (var i = 0; i < files.length; i++) {
	    var file = files[i];
	    console.log('%s (%s)', file.name, file.id);
	}
    });
}


function fakePush(cvm) 
{
    console.log("push");
    console.log(cvm);    
}


function gapiTestBatchGet()
{
    var sheetId = '18qPsgedpcgEZjwNhp9EVqXLvSergBGrnrf8T6m9umEY'; 
    var category = 'MYA';

    sstPullSheetData(sheetId, category, fakePush);    
    /*
    return;
    gapiBatchGet(
	{
	    spreadsheetId: targetGoogleSheetId,
            ranges: [
		categoryName + SHEETNUMPROBLEMSADDRESS,
		categoryName + SHEETTOPHOLDSADDRESS,
		categoryName + SHEETDATAHEADERADDRESS,
		categoryName + SHEETDATAADDRESS,
		categoryName + SHEETROUNDNAMEADDRESS
            ]
	},
	function (response) {
	    console.log(response);
	    
	});
*/
}

