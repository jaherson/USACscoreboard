var sst_version = 1.2
console.log("simplescoring.js is now loaded dynamically. Version", sst_version);
//"use strict";

//
// CONSTANTS to access data inside score sheets
//
var SHEETNAMES = ["FJR", "MJR", "FYA", "MYA", "FYB", "MYB", "FYC", "MYC", "FYD", "MYD"];
var SHEETDATAADDRESS = '!A5:Z'; // the range address of interesting data on the sheet. Note the end column allows Google to just send the interesting rows...
var CLIMBERNAMEOFFSET = 0;
var PROBLEMOFFSETS = [
    { Highhold: 5, Attempts: 6 },
    { Highhold: 8, Attempts: 9 },
    { Highhold: 11, Attempts: 12 },
    { Highhold: 14, Attempts: 15 },
    { Highhold: 17, Attempts: 18 },
    { Highhold: 20, Attempts: 21 }
];
var SPEEDROUTEOFFSETS = [5,6,7, 9,10,11];
var SHEETNUMPROBLEMSADDRESS = '!C2'; // the range address of the number of problems for this round
var SHEETTOPHOLDSADDRESS = '!H3:Z3'; // the range address of the top hold #'s of the problems
var SHEETCLIMBERSINITADDRESS = "!A5";// used to push climber names, teamnames andd memberIds into a new scoring sheet
var SHEETTOPHOLDOFFSETS = [0, 3, 6, 9, 12, 15];
var SHEETDATAHEADERADDRESS = '!A4:Z4';
var SHEETROUNDNAMEADDRESS = '!D2';   // the range address of the round name
var SHEETDISCIPLINEADDRESS = '!V1';   // the range address of the Discipline for the worksheet
var SHEETRANKOFFSET = 4;


//
// CONSTANTS for USAC requests
//
var sstCategoryName2CatId = {
    FJR: 2,
    MJR: 2,
    FYA: 3,
    MYA: 3,
    FYB: 4,
    MYB: 4,
    FYC: 5,
    MYC: 5,
    FYD: 6,
    MYD: 6
};
var sstCategoryName2Gender = {
    FJR: 'f',
    MJR: 'm',
    FYA: 'f',
    MYA: 'm',
    FYB: 'f',
    MYB: 'm',
    FYC: 'f',
    MYC: 'm',
    FYD: 'f',
    MYD: 'm'
};
var sstRoundName2Rid = {   // TODO - these values were good in the TEST Regional and Divisional
    Qualifiers: 1,
    Finals: 0,
    SuperFinals: -1,
    SemiFinal: 2,            // TODO - Guessing
    Qualifier: 1,           // TODO - hack stupid 's' at the end
    Final: 0,
    SuperFinal: -1
};
var sstRid2RoundAbbrev = { // TODO - these values were good in the TEST Regional and Divisional
    "1": "Q",
    "0": "F",
    "-1": "SF",
    "2":"S"                // TODO - Guessing
};

var sstDIDSPEED = "2";
var sstDIDSPORT = "3";
var sstDISCIPLINE2DID = {
    "Bouldering": 1,
    "Speed": 2,
    "Sport": 3
}

var GOOGLESHEETSMIMETYPE = 'application/vnd.google-apps.spreadsheet';
var EXCELXLSXMIMETYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';



//
// GLOBALS
//
var sstAwaiting = [];
var sstDriveAPILoaded = false;
var sstPickerApiLoaded = false;
var sstPickerOAuthToken;
var sstActiveSheetId;
function sstActiveSheetChange(newId) {
    changeIframeSrc(newId);
    sstActiveSheetId = newId;
}
var sstActiveSheetAutoConvertId = "";
var sstActiveSheetAutoConvertName = "";
var sstDblChkSheetId = "";
var sstDblChkExcelXLSAutoConvertId = "";
var sstDblChkExcelXLSAutoConvertName = "";

var sstCheckRankFixRoundAndResultsShownAutomatically = false;

//
// Structure for element of climbersVM array data
//
var CategoryVM = function() {
    var self = this;

    this.Name = "";
    this.Discipline = "";
    this.RoundName = "";
    this.MaxProblems = 0;
    this.TopHolds = [];
    this.MemberIdOffset = -1;
    this.IsRankGathered = false;
    this.Climbers = [];
};
var ClimberVM = function () {
    var self = this;

    this.Name = "";
    this.MemberId = "";
    this.TeamName = "";
    this.Problems = [];
    this.RouteTimes = [];   // Speed times.  Note: first 3 times are for route 1, second 3 times are for route 2.
    this.Rank = -1; 
};
var ProbVM = function () {
    var self = this;

    this.HighHold = "";
    this.Attempts = "";
};


// 
// Get data about active user's scoring module
//

function sstGetEventRegion() {
    rx = /^Event.Region\:\W(.*)$/gm;
    arr = rx.exec($("#divEventName").attr("title"));
    return arr[1].substr(0,3);
}

function sstGetEventId() {
    var edivTabHeaders = document.querySelector(".usac-view .event-view .tab-headers");
    var eid = edivTabHeaders.getAttribute("data-eventid");

    return eid;
}

function sstGetDisciplineId() {
    var disciplinediv = document.querySelector(".usac-view .event-view .tab-body.active");
    var did = disciplinediv.getAttribute("data-disciplineid");

    // just fyi
    //var currentRoundDiv = disciplinediv.querySelector(".competitor-wrapper" + catid + "[data-gender=" + g + "] .rounds-controls a.current");
    //var rid = currentRoundDiv.getAttribute("data-roundid");
    return did;
}

function sstLookupCatName(catid, gender) {
    var genderOffset = (gender === "m") ? 1 : 0;
    var catOffset = (catid - 2) * 2;
    var roundOffset = 0; // Differentiate rounds with different sheets
    var sheetName = SHEETNAMES[roundOffset + catOffset + genderOffset];

    return sheetName;
}

function sstFindClimbers(cvm) {
    var catid = sstCategoryName2CatId[cvm.Name];
    var g = sstCategoryName2Gender[cvm.Name];

    var $divC = $(DIVDISCIPLINE + " div.competitor-wrapper[data-categoryid='" + catid + "'][data-gender='" + g + "']");
    var $divCH = $divC.find(".competitor-header .rounds-controls a.current");
    if ($divCH.length)
        cvm.RoundName = $divCH[0].textContent;

    var $divCG = $divC.find("tr[data-competitorid]");
    $divCG.each(function() {
        var c = new ClimberVM();
        c.MemberId = this.attributes["data-competitorid"].value;
        c.Name = this.children[0].textContent;
        c.TeamName = this.children[1].textContent;
        if (this.querySelector(".scoring.result.rank")) {
            c.Rank = parseInt(this.querySelector(".scoring.result.rank").textContent);
            cvm.IsRankGathered = true;
        }
        cvm.Climbers.push(c);
    });
    return cvm;
}


//
// Google Sheets API
//

function sstPullSheetData(targetGoogleSheetId, categoryName, runWhenSuccess) {

    gapiBatchGet(
        {
            spreadsheetId: targetGoogleSheetId,
            ranges: [
                categoryName + SHEETNUMPROBLEMSADDRESS,
                categoryName + SHEETTOPHOLDSADDRESS,
                categoryName + SHEETDATAHEADERADDRESS,
                categoryName + SHEETDATAADDRESS,
                categoryName + SHEETROUNDNAMEADDRESS,
                categoryName + SHEETDISCIPLINEADDRESS
            ]
        },
        function (response) {
            var categoryVM = new CategoryVM();
            categoryVM.Name = categoryName;

            if (response.result.valueRanges.length < 6)
                alert("There were not the expected 6 ranges returned from this " + categoryName);

            var range5 = response.result.valueRanges[5];    // Is this for Speed
            if (range5.values && range5.values.length > 0) {
                categoryVM.Discipline = range5.values[0][0];
            } else {
                alert("The Discipline Name was not found for " + categoryName);
                return;
            }

            var range0 = response.result.valueRanges[0];    // Get Number of Problems
            if (range0.values.length > 0) {
                categoryVM.MaxProblems = parseInt(range0.values[0][0]);
            } else {
                alert("The Number of problems was not found for this " + categoryName);
                return;
            }

            var range1 = response.result.valueRanges[1];    // Get Top Hold #s for each problem
            if (range1.values.length > 0) {
                var row1 = range1.values[0];
                for (var j = 0; j < categoryVM.MaxProblems; j++) {
                    categoryVM.TopHolds.push(parseInt(row1[SHEETTOPHOLDOFFSETS[j]]));
                }
            } else {
                alert("The top hold numbers were not found for this " + categoryName);
                return;
            }

            var range2 = response.result.valueRanges[2];    // Find the column offset for the member id
            if (range2.values.length > 0) {
                var row2 = range2.values[0];
                for (var j = 0; j < row2.length; j++) {
                    if (row2[j].startsWith("Member #")) {
                        categoryVM.MemberIdOffset = j;
                        break;
                    }
                }
            } else {
                alert("The 'Member #' column header was not found for " + categoryName);
                return;
            }

            var range3 = response.result.valueRanges[3];    // Get the entered scores
            if (range3.values.length > 0) {
                for (var i = 0; i < range3.values.length; i++) {
                    var row3 = range3.values[i];

                    if (row3.length < 1 || row3[CLIMBERNAMEOFFSET] == "")
                        continue;   // don't include blank names or memberid rows
                    if (row3[categoryVM.MemberIdOffset] == "") {
                        alert("no Member # found for " + categoryName + " " + row3[CLIMBERNAMEOFFSET] + ".  No scores read beyond this person.");
                        break;
                    }

                    if (i >= categoryVM.Climbers.length - 1) {
                        categoryVM.Climbers.push(new ClimberVM);
                    }
                    var climber = categoryVM.Climbers[i];
                    climber.Name = row3[CLIMBERNAMEOFFSET];
                    climber.MemberId = row3[categoryVM.MemberIdOffset];
                    climber.Rank = row3[SHEETRANKOFFSET];

                    switch (categoryVM.Discipline) {
                        case "Speed":
                            for (var j = 0; j < 6; j++) {
                                climber.RouteTimes[j] = sstBlankNaN(parseFloat(row3[SPEEDROUTEOFFSETS[j]]));
                            }
                            break;

                        default:
                            for (var j = 0; j < categoryVM.MaxProblems; j++) {
                                climber.Problems.push(new ProbVM);
                                climber.Problems[j].HighHold = sstBlankNaN(parseFloat(row3[PROBLEMOFFSETS[j].Highhold]));
                                climber.Problems[j].Attempts = sstBlankNaN(parseInt(row3[PROBLEMOFFSETS[j].Attempts]));
                            }
                    }
                }
            } else {
                alert("No scores found for " + categoryName);
                return;
            }

            var range4 = response.result.valueRanges[4];    // Get Round name
            if (range4.values.length > 0) {
                categoryVM.RoundName = range4.values[0][0];
            } else {
                alert("The Round Name was not found for " + categoryName);
                return;
            }
            //console.log(categoryVM);
            runWhenSuccess(categoryVM);

        });
}

function sstBlankNaN(num) {         // because NaN != NaN  we don't want to compare NaN results of parseInt of an empty cell
    return isNaN(num) ? "" : num;
}

// TODO -- package up an array of cvm to pass in one batchUpdate
function sstInitSheetWithNamesId(targetGoogleSheetId, cvm, runWhenSuccess) {
    // Assumes gapi.load(googlesheetsdiscoveryUrl) already run, and response complete
    var GSRows = [];
    var GSRow = function(cells) {
        return ({ values: cells });
    };
    
    cvm.Climbers.forEach(function (c) {
        var gsCells = [];
        gsCells.push(c.Name);
        gsCells.push(c.TeamName);
        gsCells.push(c.MemberId);
        GSRows.push(GSRow(gsCells));
    });

    gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: targetGoogleSheetId,
        valueInputOption: "USER_ENTERED",
        data: [
            {
                range: cvm.Name + SHEETCLIMBERSINITADDRESS,
                values: GSRows
            }
        ]
    }).then(function (response) {
        // alert("Updated " + response.result.totalUpdatedRows + " Climbers");

        if (runWhenSuccess)
            runWhenSuccess(response);
    }, function (response) {
        alert("Error trying to push " + cvm.Name + ".  " + response.result.error.message);
    });
}



//
// sst UI
//
function sstCurrentSheetChanged(value) {
    var fi = JSON.parse(value);
    var fileId = fi.id;
    if (fi.mimeType === GOOGLESHEETSMIMETYPE) {
        sstActiveSheetAutoConvertId = "";
        sstActiveSheetAutoConvertName = "";
        sstActiveSheetChange(fileId);
        $("#divSheets").removeClass("sst-greyed-autoconverted-and-will-be-overwritten");
    } else if (fi.mimeType === EXCELXLSXMIMETYPE) {         // an XLSX fileId  0B8VRfGThSdoAQzVXV3k5UFN1VG8
        // convert and then point to the converted file
        sstActiveSheetAutoConvertId = fileId;
        sstActiveSheetAutoConvertName = fi.name;
        sstTryAutoConvert(true);
        $("#divSheets").addClass("sst-greyed-autoconverted-and-will-be-overwritten");
    } 
}
function sstDblChkSheetChanged(value) {
    var fi = JSON.parse(value);
    var fileId = fi.id;
    if (fi.mimeType === GOOGLESHEETSMIMETYPE) {
        sstDblChkSheetId = fileId;
        sstDblChkExcelXLSAutoConvertId = "";
        sstDblChkExcelXLSAutoConvertName = "";
    } else if (fi.mimeType === EXCELXLSXMIMETYPE) {         // an XLSX fileId  0B8VRfGThSdoAQzVXV3k5UFN1VG8
        // convert and then point to the converted file
        sstDblChkExcelXLSAutoConvertId = fi.id;
        sstDblChkExcelXLSAutoConvertName = fi.name;
    }
    sstCompareClicked(true);
}

function sstPushtoUSACClicked() {
    sstTryAutoConvert(true, sstPushtoUSAC);
}
function sstPushtoUSAC() {
    var selectedCategories = sstGetSelectedCategories();
    if (selectedCategories.length === 0) {
        alert("Please select at least 1 category to push data to USAC.");
        return;
    }

    sstRemoveAllAwaiting();

    for (var c = 0; c < selectedCategories.length; c++) {
        sstPullSheetData(sstActiveSheetId, selectedCategories[c], sstPushDatatoUSACCallback);
    }
}

function sstGetSelectedCategories() {
    var sstCheckboxes = document.getElementById("sst-form").getElementsByClassName("sst-toggle");
    var selectedCategories = [];
    for (var i = 0; i < sstCheckboxes.length; i++) {
        if (sstCheckboxes[i].checked) {
            selectedCategories.push(sstCheckboxes[i].value);
        }
    }
    return selectedCategories;
}
function sstPushDatatoUSACCallback(cvm) {
    if (sstDISCIPLINE2DID[cvm.Discipline] != sstGetDisciplineId()) {
        alert("The selected sheet (cell V2) is for a discipline that does NOT match the currently selected discipline for scoring in USAC.");
        return;
    }
    sstipjUSACSaveClimbersTable(
        sstGetEventId(),
        sstGetDisciplineId(),
        sstRoundName2Rid[cvm.RoundName],
        sstCategoryName2CatId[cvm.Name],
        sstCategoryName2Gender[cvm.Name],
        cvm
    );
}

function sstCompareClicked(notbyUI) {
    if (sstGetDisciplineId() == sstDIDSPEED) {
        alert("This feature is not supported for Speed.");
        return;
    }
    if (!sstActiveSheetId)
        alert("You must select the main sheet first.");
    if (!notbyUI) {
        $('#dblChkSheetSelectList').prop('selectedIndex', 0);
        $("#sst-controls div.sst-compare-button-group-div tr.second").show();
        return;
    }
    if (!sstDblChkSheetId && !sstDblChkExcelXLSAutoConvertId) {
        alert("Sheet to compare is not selected");
        return;
    }
    $("#sst-controls div.sst-compare-button-group-div tr.second").hide();
    sstPrintResetShow();
    
    if (sstDblChkExcelXLSAutoConvertId) {
        // convert and then compare
        sstTryAutoConvert(false, sstCompare, sstDblChkExcelXLSAutoConvertId, sstDblChkExcelXLSAutoConvertName);
        return;
    } else if (sstDblChkSheetId) {
        sstCompare(sstDblChkSheetId);
    } else {
        alert("Select a sheet to compare in the dropdown list below the Compare button");
    }
}

function sstCompare(dblCheckFileId) {
    for (var i = 0; i < SHEETNAMES.length; i++) {
        sstPullSheetData(dblCheckFileId, SHEETNAMES[i],
            sstCompareClosure1(i)
            );
    }
}
function sstCompareClosure1(i) {
    return function(dblCheckCVM) {
        sstPullSheetData(sstActiveSheetId, SHEETNAMES[i],
            sstCompareClosure2(i, dblCheckCVM)
            );
    };
}
function sstCompareClosure2(i, dblCheckCVM) {
    return function (cVM) {
                sstCompareCVM(SHEETNAMES[i], cVM, dblCheckCVM);
            };
}

function sstCompareCVM(categoryName, cvmMain, cvm2nd) {
    // check same climbers
    var arrayMainClimbers = sstGetJQArrayClimbers(cvmMain);
    var array2ndClimbers = sstGetJQArrayClimbers(cvm2nd);
    var arrayNotIn2nd = arrayMainClimbers.not(array2ndClimbers);
    var arrayNotInMain = array2ndClimbers.not(arrayMainClimbers);
    if (arrayNotIn2nd.length > 0 || arrayNotInMain.length > 0) {
        sstPrint("These climbers are not in the 2nd " + categoryName + "sheet:" + arrayNotIn2nd.toArray().join(', '));
        sstPrint("These climbers are not in the current " + categoryName + "sheet:" + arrayNotInMain.toArray().join(', '));
    }

    // check problems of each climber. Assumes all climbers are in Main and 2nd
    cvmMain.Climbers.forEach(function (c) {
        if (c.MemberId == "")
            return;

        var c2match = cvm2nd.Climbers.filter(function (c2) { return c2.MemberId === c.MemberId })[0];

        if (c.Problems.length != c2match.Problems.length)
            sstPrint(categoryName + " have a different count of Problems (" + c.Problems.length + "," + c2match.Problems.length + ")");

        for (var iP = 0; iP < c.Problems.length; iP++) {
            if (c.Problems[iP].HighHold != c2match.Problems[iP].HighHold) {
                sstPrint(categoryName + " " + c.Name + " Problem " + (iP + 1) + " Highhold.   [" + c.Problems[iP].HighHold + " differs from " + c2match.Problems[iP].HighHold + "]");
            }

            if (c.Problems[iP].Attempts != c2match.Problems[iP].Attempts) {
                sstPrint(categoryName + " " + c.Name + " Problem " + (iP + 1) + " Clips.   [" + c.Problems[iP].Attempts + " differs from " + c2match.Problems[iP].Attempts + "]");
            }
        }
    });
    sstPrint(categoryName + " comparison complete.",true);
}

function sstPrint(s, isGood, fixItFunction) {
    var p = $("<p></p>")
        .addClass("sst-compare-result-p")
        .addClass(isGood ? "sst-good" : "")
        .text(s);

    if (fixItFunction) {
        p.append($("<a></a>")
            .addClass("sst-compare-result-fixit")
            .click(fixItFunction)
            .text("Fix it!"));
    }

    var resultsDiv = $("#sst-compare-results-div")
        .append(p);

    var ps = $("#sst-compare-results-div").children('p');
    ps.sort(function(a, b) {
        return a.textContent.localeCompare(b.textContent);
    });
    ps.detach().appendTo(resultsDiv);
}
function sstPrintResetShow() {
    $("#sst-compare-results-div").empty();
    $("#sst-compare-auto-div").hide();
    $("#sst-compare-results-wrapper").show();
}
function sstPrintFixItFinished(target) {
    //$(target).hide();
    $(target).text("A fix was attempted.  Try compare again.");
}

function sstGetJQArrayClimbers(cvm) {
    return $($.map(cvm.Climbers, function (c) {
        return c.Name.toLowerCase();
    }));
}

function sstPushClimberNamesIds2SheetClicked() {
    if (!sstActiveSheetId) {
        alert("You must select the main sheet first.");
    }

    if (confirm("This will OVERWRITE your sheet below with the names and ids of this event for ALL categories. Are you sure you want to continue with this scoresheet initialization?")) {
        SHEETNAMES.forEach(function(catName) {
            var cvm = new CategoryVM();
            cvm.Name = catName;
            sstFindClimbers(cvm);
            sstInitSheetWithNamesId(sstActiveSheetId, cvm);
        });
    }
}

function sstCheckRankComputationClicked() {
    if (sstGetDisciplineId() == sstDIDSPEED) {
        alert("This feature is not supported for Speed.");
        return;
    }
    if (!sstActiveSheetId)
        alert("You must select the main sheet first.");
    sstPrintResetShow();
    $("#sst-compare-auto-div").show();

    sstCheckRankFixRoundAndResultsShownAutomatically = $("#sst-compare-fix-usacpage-automatic-checkbox")[0].checked;
    // compare the current sheet with the currently shown ranking in whatever round is shown
    SHEETNAMES.forEach(function (catName) {
        var cvmOnWebPage = new CategoryVM();
        cvmOnWebPage.Name = catName;
        sstFindClimbers(cvmOnWebPage);

        sstPullSheetData(sstActiveSheetId, catName, sstCheckRankCompClosure(cvmOnWebPage));
    });
    
}

function sstCheckRankCompClosure(cvmOnWebPage) {
    return function(sheetCVM) {
        sstCheckRankComp(sheetCVM, cvmOnWebPage);
    };
}
function sstCheckRankComp(sheetCVM, cvmOnWebPage) {
    if (sheetCVM.RoundName.substring(0, 4) != cvmOnWebPage.RoundName.substring(0, 4)) {
        if (sstCheckRankFixRoundAndResultsShownAutomatically) {
            sstPrint(sheetCVM.Name + " is set to different rounds. [" + sheetCVM.RoundName + " vs. " + cvmOnWebPage.RoundName + "].  Attempting to change now. Try Compare again.",
                true);
            sstChangeRound(sheetCVM.Name, sstRoundName2Rid[sheetCVM.RoundName]);
        } else {
            sstPrint(sheetCVM.Name + " is set to different rounds. [" + sheetCVM.RoundName + " vs. " + cvmOnWebPage.RoundName + "]",
                true,
                function(evt) {
                    sstChangeRound(sheetCVM.Name, sstRoundName2Rid[sheetCVM.RoundName]);
                    sstPrintFixItFinished(evt.target);
                });
        }
        return;
    }

    if (!cvmOnWebPage.IsRankGathered) {
        if (sstCheckRankFixRoundAndResultsShownAutomatically) {
            sstPrint(cvmOnWebPage.Name + " on the USAC page is not currently showing round results.  Attempting to fix that now. Try Compare again.", true);
            sstShowRoundResults(cvmOnWebPage.Name, sstRoundName2Rid[cvmOnWebPage.RoundName]);
        } else {
            sstPrint(cvmOnWebPage.Name + " on the USAC page is not currently showing round results.", true, function(evt) {
                sstShowRoundResults(cvmOnWebPage.Name, sstRoundName2Rid[cvmOnWebPage.RoundName]);
                sstPrintFixItFinished(evt.target);
            });
        }
        return;
    }

    // check same climbers
    var arrayMainClimbers = sstGetJQArrayClimbers(sheetCVM);
    var array2ndClimbers = sstGetJQArrayClimbers(cvmOnWebPage);
    var arrayNotIn2nd = arrayMainClimbers.not(array2ndClimbers);
    var arrayNotInMain = array2ndClimbers.not(arrayMainClimbers);
    if (arrayNotIn2nd.length > 0 || arrayNotInMain.length > 0) {
        sstPrint("These climbers are not in the " + sheetCVM.Name + " sheet:" + arrayNotIn2nd.toArray().join(', ') +
        ".  And these climbers are not on the " + sheetCVM.Name + " section of the webpage:" + arrayNotInMain.toArray().join(', '));
    }

    // check problems of each climber. Assumes all climbers are in both
    sheetCVM.Climbers.forEach(function (c) {
        if (c.MemberId == "")
            return;

        var c2match = cvmOnWebPage.Climbers.filter(function (c2) { return c2.MemberId === c.MemberId })[0];

        if (c.Rank != c2match.Rank) {
            sstPrint(sheetCVM.Name + " " + c.Name + " has different computed ranks.   [" + c.Rank + " vs. " + c2match.Rank + "]");
        }
    });
    sstPrint(sheetCVM.Name + " ranking compare finished.", true);
}


//
// Status of Pushes to USAC
//
function sstAddAwaiting(toAdd) {
    sstAwaiting.push(toAdd);
    sstDisplayAwaiting();
}

function sstDisplayAwaiting() {
    var s = "";
    for (var i = 0; i < sstAwaiting.length; i++) {
        s += sstAwaiting[i] + " ";
    }
    $("#sst-awaiting-span").text(s);
    if (sstAwaiting.length > 0) {
        $("#sst-awaiting-p").show();
    } else {
        $("#sst-awaiting-p").hide();
    }
}

function sstRemoveAwaiting(toRemove) {
    var index = sstAwaiting.indexOf(toRemove);

    if (index > -1) {
        sstAwaiting.splice(index, 1);
    } else {    // toRemove is not found
        // removed this since we could be removing awaiting if the user pushes to usac before all the others come back.  alert("somehow was asked to remove an item we didn't ask to be pushed?");
    } 
    sstDisplayAwaiting();
}
function sstRemoveAllAwaiting() {
    sstAwaiting.length = 0;
}

function sstGenAwaitingName(rid,catid,g,pid) {
    return sstLookupCatName(catid, g) + "-" + sstRid2RoundAbbrev[rid] + pid;
}

function gapiBatchGet(options, responseCB)
{
    var url = '/gapi/batchGet?' + JSON.stringify(options);
    gapiProxy(url, responseCB);
}
function gapidriveFilesCopy(options, responseCB) {
    var url = '/gapi/filesCopy?' + JSON.stringify(options);
    gapiProxy(url, responseCB);
}
function gapidriveFilesList(options, responseCB) {
    var url = '/gapi/filesList?' + JSON.stringify(options);
    gapiProxy(url, responseCB);
}
function gapidriveFilesDelete(options, responseCB) {
    var url = '/gapi/filesDelete?' + JSON.stringify(options);
    gapiProxy(url, responseCB);
}

function gapiProxy(url, responseCB) {
    var jqxhr = $.getJSON(url, function(data) {
            var response = { 'result': data };
            responseCB(response);
        })
        .fail(function() {
            console.log("gapi failed");
        })
        .always(function() {
            console.log("gapi done");
        });
}

//
// Autoconvert
//

function sstCopyXLS2GoogleSheet(originFileId, newTitle, runAfterCopy) {
    var request = gapidriveFilesCopy(
        {
            fileId: originFileId,
            resource: {
                name: newTitle,
                mimeType: 'application/vnd.google-apps.spreadsheet',
            }
        },
        function(resp) {
            console.log('Copy ID: ' + resp.id);
            runAfterCopy(resp);
        }
    );
}

function sstTryAutoConvert(isShouldUpdateActiveSheetIfAC, callback, xlsId, xlsName) {   // use 2 globals (if parameters are null) and a nullable callback parameter
    if (!xlsId && sstActiveSheetAutoConvertId === "") {
        if (callback)
            callback(false);
        return; // nothing to convert
    }

    xlsName = (xlsName) ? xlsName : sstActiveSheetAutoConvertName;
    sstSearchDestroyACByFilename(sstDeleteMeFilename(xlsName)); // Hope this never deletes the new copy....

    $("#sst-awaiting-autoconvert").show();
    sstCopyXLS2GoogleSheet(
        (xlsId) ? xlsId : sstActiveSheetAutoConvertId,
        sstDeleteMeFilename(xlsName),
        function (response) {
            $("#sst-awaiting-autoconvert").hide();
            if (isShouldUpdateActiveSheetIfAC)   // only update the activesheet if we were trying to convert the old activesheet 
                sstActiveSheetChange(response.result.id);
            if (callback)
                callback(response.result.id);
        }
    );

}
function sstDeleteMeFilename(fn) {
    return ("DeleteMeLater " + fn);
}

function sstSearchDestroyACByFilename(filename) {
    var request = gapidriveFilesList({
        'q': "name='" + filename + "'",
        'pageSize': 200,
        'fields': "nextPageToken, files(id, name, trashed)"
    },
        function (resp) {
        var files = resp.result.files;
        if (files && files.length > 0) {
            for (var i = 0; i < files.length; i++) {
                sstSearchDestroyACById(files[i].id);
            }
        }
    });
}
function sstSearchDestroyACById(fileId) {
    var request = gapidriveFilesDelete({
        'fileId': fileId
    },
        function (resp) {
        console.log('Deleted previous autoconverted file.');    // note that resp is empty if successful
    });
}

function sstLoadSheetSelect()
{
    var sheetSelect = $("#SheetSelectList");
    var dblChkSheetSelect = $("#dblChkSheetSelectList");
    var REGION2FOLDERID = {
	"101": '0B8VRfGThSdoAUDlKS0o5b0l0cnc', //sportspeed/2017/Region101
	"201": '0B8VRfGThSdoAMnRBXzBiSnMxLUE', //sportspeed/2017/Region201
    }
    // error check valid Region numbers!
    var folderId = REGION2FOLDERID[sstGetEventRegion()];
    var queryFolder = "'" + folderId + "' " + "in parents";
    var queryMimeType = "mimeType = 'application/vnd.google-apps.spreadsheet'";
    var query = '"' + queryMimeType + ' and ' + queryFolder + '"';     // if this is ever used, need to keep Excel mimetype too...
    var options = {};
    options.q = queryFolder; 

    gapidriveFilesList(options, function (response) {
        console.log(response);
        var files = response.result.files;
        sheetSelect.empty();
        dblChkSheetSelect.empty();
        sheetSelect.append($('<option selected disabled>Choose Google Sheet, or xlsx to autoconvert</option>'));
        dblChkSheetSelect.append($('<option selected disabled>Choose a sheet to compare...</option>'));
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            console.log(file);

            // load a default sheet. Might conflict with the auto convert idea?
            if (i == 0 && file.mimeType == GOOGLESHEETSMIMETYPE)
                sstActiveSheetChange(file.id);

            $fi = $('<option>', {
                value: JSON.stringify({ id: file.id, name: file.name, mimeType: file.mimeType }),
                text: file.name + (file.mimeType == EXCELXLSXMIMETYPE ? " //XL native will be autoconverted" : "")
            });
            sheetSelect.append($fi);
            dblChkSheetSelect.append($fi.clone(true));
        }
    });
}


