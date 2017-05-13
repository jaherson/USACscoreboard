"use strict";
console.log("scoreboard loaded");

//var DEFAULTSHEETID = '18qPsgedpcgEZjwNhp9EVqXLvSergBGrnrf8T6m9umEY';
var DEFAULTSHEETID = '1ObDxmWDL4dfZzlnnC-2qkSQtmMO5ssts6SeuYIe5Q-4';
var sstActiveSheetId = DEFAULTSHEETID; 
var DIVDISCIPLINE = "#divSport";

function scoreboardInit()
{
    var divBouldering = $(DIVDISCIPLINE);

    if (divBouldering.length == 0) {
        console.log("can't locate divSport");
        return;
    }

    loadStyle("/scoreboard/sst.css");

    //loadScript("/scoreboard/simplescoring.js"); // maps->excel cells version
    loadScript("/scoreboard/simplescoringHardWired.js"); // original version    
    loadScript("/scoreboard/senddata2usac.js");

    divBouldering
	.before($('<div id="sst-partialHTML" style="display:none;">')
	.load("/scoreboard/partialHTMLforSimpleScoring.html"));

    var contentArea = $('#sst-partialHTML');
    contentArea.after($('<center><div id="divSheets" style="margin:5px 10px;display:none;"><iframe id="iframeSheets" style="width: 100%; height: 700px;"></iframe></div>' +
        '<div id="sst-eventid-div">Event Id: <span id="sst-eventid-span"></span></div ><center>'));
//	changeIframeSrc(DEFAULTSHEETID);

//    $('#iframeSheets').on('load', alert('load'));
//    $('#iframeSheets').on('click', alert('click'));

    setTimeout(waitForBoulderingTab, 1000);

    return;
}

function waitForBoulderingTab() {
    var divBouldering = $(DIVDISCIPLINE);
    var divSheets = $("#divSheets");
    var divSST = $("#sst-partialHTML");

    if (divBouldering.length==0 || divSheets.length==0 || divSST.length==0) {
        console.log("Error: can't locate divBouldering or divSheets or divSST!");
        return;
    }

    if (divBouldering.attr('class') != 'tab-body new-gui active') {
        console.log("bouldering tab not enabled");
        //unforunately we have to poll until boudering tab is loaded. No real convenient way to get an div/onload event
        setTimeout(waitForBoulderingTab, 1000);
        return;
    }

    sstLoadSheetSelect();

	ScoringView(0);

    divSST.show(); //weird ScoringView doesn't work on this?
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
    $(DIVDISCIPLINE).show();  
	$('#pagetitle').show();
	$('#divIntro').show();
	$('div.footer-wrapper').show();
	$("#sst-controls").hide();
	$(".sst-round-category-selection").hide();
	$("#divSheets").hide();
        $("#sst-eventid-div").hide();
	break;
    case 0:
    $(DIVDISCIPLINE).hide();
	$('#pagetitle').hide();
	$('#divIntro').hide();
	$('div.footer-wrapper').hide();
	$("#sst-controls").show();
	$(".sst-round-category-selection").show();
	$("#divSheets").show();
        $("#sst-eventid-div").show();
	break;
    }
    $("#sst-eventid-span").text($("#divEvent #divTabHeaders").attr("data-eventid"));
}

function loadStyle(cssfile)
{
    $("head").append($('<style></style>').load(cssfile));
}

var loadScript = function (path) {
    var result = $.Deferred(),
        script = document.createElement("script");
    script.async = "async";
    script.type = "text/javascript";
    script.src = path;
    script.onload = script.onreadystatechange = function (_, isAbort) {
        if (!script.readyState || /loaded|complete/.test(script.readyState)) {
            if (isAbort)
                result.reject();
            else
                result.resolve();
        }
    };
    script.onerror = function () { result.reject(); };
    $("head")[0].appendChild(script);
    return result.promise();
};


if (window.attachEvent) {
    window.attachEvent('onload', scoreboardInit);
} else if (window.addEventListener) {
    window.addEventListener('load', scoreboardInit, false);
} else {
    document.addEventListener('load', scoreboardInit, false);
}

