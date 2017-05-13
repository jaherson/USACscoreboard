// gapi test functions
console.log("Standalone tests loaded");

function gapiTestFilesList()
{
    //var folderId = '0B8VRfGThSdoAYmtIMkN3ZE1SOXc'; 
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
}

function gapiTestFilesCopy()
{
    var srcId = '1gOhqwcS0Q3T_uablxlm4quhu8HY15P7CkT3GQW-itTI';
    var request = gapidriveFilesCopy({
        fileId: srcId,
	resource: {
            name: 'jim.sheets',
            mimeType: 'application/vnd.google-apps.spreadsheet'
	}
    },
        function (resp) {
            console.log(resp);
	});
}

function gapiTestFilesDelete()
{
    var fileId = '1GfDRi9TzHvs672OCoT8939xcK1PFK0CnXmh6MqEeSQ0';
    var request = gapidriveFilesDelete({
        fileId: fileId
    },
        function (resp) {
            console.log(resp);
	});
}

