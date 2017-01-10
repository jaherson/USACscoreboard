"use strict";
console.log("scoreboard loaded");

var MATT = '1eUQ_5E7PnJ3Nq39q-FFtgITpicdQNgx4Key7AiKjgp8';
var LARRY = '18qPsgedpcgEZjwNhp9EVqXLvSergBGrnrf8T6m9umEY'; 
var DEFAULTSHEETID = LARRY;
var sstActiveSheetId = DEFAULTSHEETID; 

function scoreboardInit()
{
    var divBouldering = $("#divBouldering");

    if (divBouldering.length == 0) {
        console.log("can't locate divBouldering");
        return;
    }

    $("head")
        .append($('<style></style>')
        .load("/scoreboard/sst.css"));


    divBouldering
	.before($('<div id="sst-partialHTML" style="display:none;">')
	.load("/scoreboard/partialHTMLforSimpleScoring.html"));

    var contentArea = $('div.contentarea.content-container');
    contentArea.after($('<center><div id="divSheets" style="margin:5px 10px;display:none;"><iframe style="width: 100%; height: 700px;"></iframe></div><center>'));

	changeIframeSrc(DEFAULTSHEETID);

	setTimeout(waitForBoulderingTab, 1000);

	return;
}

function waitForBoulderingTab() {
    var divBouldering = $("#divBouldering");
    var divSheets = $("#divSheets");
    var divSST = $("#sst-partialHTML");

    if (divBouldering.length==0 || divSheets.length==0 || divSST.length==0) {
        console.log("Error: can't locate divBouldering or divSheets!");
        return;
    }

    if (divBouldering.attr('class') != 'tab-body active') {
        console.log("bouldering tab not enabled");
        //unforunately we have to poll until boudering tab is loaded. No real convenient way to get an div/onload event
        setTimeout(waitForBoulderingTab, 1000);
        return;
    }

    divBouldering.hide();
    divSST.show();
    divSheets.show();
}

function changeIframeSrc(newSheetID) {
    var sstPREFIX_GOOGLESHEET_URL = "https://docs.google.com/spreadsheets/d/";
    var sstSUFFIX_GOOGLESHEET_URL = "/edit";

    $('#divSheets iframe').attr('src', sstPREFIX_GOOGLESHEET_URL + newSheetID + sstSUFFIX_GOOGLESHEET_URL);
}

function ScoringView(id) {
    console.log(id);
    switch(id) {
    case 1:
        $(".sst-round-category-selection").hide();
	$("#divSheets").hide();
	$("#divBouldering").show();
	break;
    case 0:
	$("#divBouldering").hide();
        $(".sst-round-category-selection").show();
	$("#divSheets").show();
	break;
    }
}

if (window.attachEvent) {
    window.attachEvent('onload', scoreboardInit);
} else if (window.addEventListener) {
    window.addEventListener('load', scoreboardInit, false);
} else {
    document.addEventListener('load', scoreboardInit, false);
}

