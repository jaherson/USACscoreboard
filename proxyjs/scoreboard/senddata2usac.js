console.log("senddata2usac.js is now loaded dynamically");

function sstipjUSACSaveClimbersTable(eid, did, rid, catid, g, cvm) {
    // TODO - Ignoring ipjUSACBusy   for now....
    for (var pid = 1; pid < cvm.MaxProblems + 1; pid++) {
        var scores = sstGetScoresOf1Prob(pid, cvm.Climbers);
        var t = cvm.TopHolds[pid - 1];
        var torig = 0;  // if torig is equal to t, then t is not recorded on server
        var rs = ipjUSACGetRoundStatus(did, rid, g, catid);  // BAD assumption - it varies : Assuming 2 is always good RoundStatus. I was looking at my current Test Module's problem "round statuses": ipjUSACGetRoundStatus(did, rid, g, catid);

        try {
            ipjDoXmlHttpRequest(ipjUSACUniqueID, document.forms['IronPointForm'].action, "savescoresonsight|" + eid + "|" + did + "|" + g + "|" + catid + "|" + rid + "|" + pid + "|" + t + "|" + torig + "|" + rs + "|" + scores, sstonSaveScoresOnsightResponse, null, true);
            sstAddAwaiting(sstGenAwaitingName(rid,catid,g,pid));
        } catch (e) {
            alert('An exception occurred pushing scores to USAC.');
        }
    }    
}

function sstGetScoresOf1Prob(problemNumber, climbersVM) {
    var s = "";

    for (r = 0; r < climbersVM.length; r++) {
        if (problemNumber < 0 || climbersVM[r].Problems.length < problemNumber || climbersVM[r].MemberId == "")
            continue;
        else {
            s += climbersVM[r].MemberId;
            s += ("^" + climbersVM[r].Problems[problemNumber - 1].HighHold);
            s += ("^" + climbersVM[r].Problems[problemNumber - 1].Attempts);
        }
        s += "~";
    }
    return s;
}

function sstonSaveScoresOnsightResponse(objXMLHTTP) {     // Does not update data shown on webpage
    // TODO - ipjUSACBusy = true;
    var r = "";
    try {
        var s = objXMLHTTP.responseText;
        r = s.substring(0, 2);
        if ((r == "s1") || (r == "s2")) { // success would normally update the USAC official scoring ui here
            //var responseFrom = s.split("|", 6);
            s = s.substring(2);
            var eid = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);
            var did = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);
            var catid = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);
            var g = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);
            var rid = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);
            var pid = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);

            sstRemoveAwaiting(sstGenAwaitingName(rid, catid, g, pid));
            console.log("a post to server has returned! category=" + catid +
                                                        " gender=" + g +
                                                        " problem=" + pid);
            return true;
        } else if (r == "s0" || r == "s3") {  // an error returned
            s = s.substring(2);
            var eid = s.substring(0, s.indexOf("|"));
            s = s.substring(s.indexOf("|") + 1);
            var did = s.substring(0, s.indexOf("|"));
            ipjUSACFlagForRefresh(true);    // TODO - maybe this should be for all responses?
            var tab = document.querySelector(".usac-view .event-view .tab-header[data-disciplineid='" + Math.abs(did) + "']");
            var tabBody = document.querySelector(".usac-view .event-view .tab-body[data-disciplineid='" + Math.abs(did) + "']");
            alert("USAC did not acknowledge success. Try pushing scores again. ");
            tabBody.innerHTML = s.substring(s.indexOf("|") + 1);
            tab.setAttribute("data-loaded", "true");
            ipjUSACSetVisibleCategories(did);
        }
        alert('An error occurred saving scores for onsight. Perhaps you did not Complete Round (previous), to allow for entering scores of this selected round for the selected category.' + s);
    } catch (e) {
        alert('An exception occurred saving scores for onsight. Try pushing scores again.');
    } finally {
        // TODO - ipjUSACBusy = false;
        if (r != "s3") {

        }
    }

    return false;
}

function sstChangeRound(catName, rid) {
    // Change Round
    var s = $("<span></span>");
    var a = $("<a></a>");
    s.append(a);
    ipjUSACRoundClick(a[0], sstGetEventId(), sstGetDisciplineId(), sstCategoryName2CatId[catName], sstCategoryName2Gender[catName], rid);
}

function sstShowRoundResults(catName, rid) {
    var t = $("<input></input>");
    var label = $("<label></label>");
    var d = $("<div></div>").append(t).append(label);
    
    ipjUSACShowOnsightTotals(t[0], sstGetEventId(), sstGetDisciplineId(), sstCategoryName2CatId[catName], sstCategoryName2Gender[catName], rid);  // if returns false, then there was data that the user entered that should be saved first
}
