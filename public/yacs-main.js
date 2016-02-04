// yacs namespace
// contains application constants
var nsYacs = {
  deptColumnWidth : 600, // should be the same as the width
                         // defined for <school> in yacs-main.css
  deptColumnMargin : 10, // should be the same as side margins defined
                         // for <school> in yacs-main.css
  weekdayNames : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
		  'Friday', 'Saturday']
}

/* cookie helper functions
   based on W3C javascript cookie reference
   http://www.w3schools.com/js/js_cookies.asp */

function setCookie(name,value) {
  document.cookie = name+"="+value+"; path=/";
}

function getCookie(name) {
  name += "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
  }
  return null;
}

// user namespace (holds user-specific data, in particular selected courses)
var nsUser = {
  /* We hold selected section IDs in a Javascript cookie in order to make them
     persist if the user navigates away from the page. These functions access
     and modify that cookie data. The section IDs are stored as a comma-
     separated list.
  */
  // Get the raw cookie string (useful for passing straight to schedules)
  getSelectionsRaw: function() {
    return getCookie('selections');
  },

  // Get the selections from the cookie as an array of strings
  getSelections: function() {
    var selections = getCookie('selections');
    return selections ? selections.split(',') : [];
  },

  // Add a selection to those already selected. Return the success value.
  addSelection: function(sid) {
    arr = this.getSelections();
    if (arr.indexOf(sid) != -1) return false;
    arr.push(sid);
    setCookie('selections', arr.join(','));
    return true;
  },

  // Remove a selection from the cookie. Return the success value.
  removeSelection: function(sid) {
    arr = this.getSelections();
    i = arr.indexOf(sid);
    if (i === -1) return false;
    arr.splice(i, 1);
    setCookie('selections', arr.join(','));
    return true;
  },

  // Determine whether the user has already selected a given section ID
  hasSelection: function(sid) {
    return this.getSelections().indexOf(sid) != -1;
  }
}

/* Format some items which appear on the search results page into their final
   display. The API does not load text like "credits" or "Section"; the
   application is responsible for this process.
*/
function formatSearchResults() {
  $('course-credits').html(function(index, oldhtml) {
    if(oldhtml === '1') { return oldhtml + ' credit'; }
    else { return oldhtml + ' credits'; }
  });
  $('section-name').prepend('Section ');
  $('section-seats-available').append(' seats');
}

/* Helper function to do the actual AJAX request. Takes a filename (same public
   XML document on the server) and a callback function which will get called
   with a single argument of the response text. 
   This will work with API documents, which should be on an root-relative path
   like "/api/v5/whatever.xml"
   Schedules get a JSON object. Using this will return it as text, which can
   then be parsed into JSON with JSON.parse().
   If this is being called in any "loader" function, make sure it's the last
   call in that function. Otherwise, any code after it can't assume that the
   code in the callback has finished.
*/
function doAjaxRequest(filename, callback) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", function() {
    callback(request.response);
  });
  request.open("GET", filename, true); 
  request.send();
} 


// Clear the main div of any content and possibly put a loading indicator on
// the page.
function clearForNewPage() {
  // Using jQuery empty() is guaranteed to remove all event handlers that have
  // been applied to anything in the content. Without this, event handlers may
  // build up over time and slow down the page.
  $('div#content').empty();

  // can add in some code to set the inner HTML of the content container to some
  // default "Loading..." message or whatever here
  $('div#content').append('<img id="loading" src="loading.gif" />');
}

// Once the departments XML has been loaded into div#content, do any other steps
// needed to crunch it into presentable form.
function setupHomePage() {
  // When loading the home page, this must determine how many columns to
  // place the departments in, and then apply styling as needed to make them fit
  // into that many columns. Our approach is to always use the maximum possible
  // number of columns. The width of the output columns is always assumed to be
  // the maximum width of any school or department element.
  var numColumns =
    Math.floor($(document).width() /
  	       (nsYacs.deptColumnWidth + (nsYacs.deptColumnMargin * 2)));
  var schoolsFinalWidth = numColumns *
    (nsYacs.deptColumnWidth + (nsYacs.deptColumnMargin * 2));
  
  // This application does not know whether there are schools defined in the
  // database. If there are, the <schools> element will have a nonzero number of
  // children.
  var schoolsArray = $('schools').children();
  var numSchools = schoolsArray.length;
  
  if(numSchools === 0) {
    // schools are not defined
    $('schools').remove();
    if(numColumns > 1) {
      // height calculations are much simpler; all we have to do is find a
      // roughly equal number of departments per column. Still have to do <td>
      // wrapping though.
      var columnCtr = 0;
      var deptsPerColumn =
  	Math.ceil($('departments').children().length / numColumns);
      var appendLastTD = true;
      $('department').each(function(i, dept) {
  	if(columnCtr === 0) {
  	  $(dept).before('<td>');
  	}
  	columnCtr++;
  	if(columnCtr === deptsPerColumn) {
  	  $(dept).after('</td>');
  	  columnCtr = 0;
  	}
      });
      
      if(appendLastTD) {
  	$('departments').append('</td>');
      }
      $('departments').wrapInner('<table id="homeTable"><tr></tr></table>');
    }
  }
  else {
    // schools are defined
    if(numColumns > 1) {
      // need to calculate the "height" of each school, not in pixels, but in
      // some arbitrary unit of height independent of the styling.
      schoolHeights = [];
      $('school').each(function(i, obj) {
  	// school height = the number of <department> tags within its list plus
  	// 1 for the school heading (assumed to be around the same height as a
  	// department)
  	schoolHeights[i] =
  	  { 'height' : $(obj).find('department').length + 1,
  	    'data' : '<school>'+$(obj).html()+'</school>' };
      });
      // Order the schoolHeights array by height
      schoolHeights.sort(function(x,y) { return x.height < y.height });

      // I'm not implementing the full general solution to this problem (how
      // best to distribute elements of varying heights evenly in a number of
      // columns) at this time. The current algorithm is: put them in columns
      // 1, 2, ..., n; 1, 2, ..., n; and so on until all schools are gone.

      // Iterate over the <school>s and wrap each group of numColumns of them
      // in a td tag.
      var columnCtr = 0;
      var schoolsPerColumn = Math.ceil(numSchools / numColumns);
      var appendLastTD = true;
      if(numSchools / numColumns === 0) {
  	appendLastTD = false; // it will be appended by the loop
      }
      $('school').each(function(i, school) {
  	if(columnCtr === 0) {
  	  $(school).before('<td>');
  	}
  	columnCtr++;
  	if(columnCtr === schoolsPerColumn) {
  	  $(school).after('</td>');
  	  columnCtr = 0;
  	}
      });
      
      if(appendLastTD) {
  	$('schools').append('</td>');
      }
      $('schools').wrapInner('<table id="homeTable"><tr></tr></table>');
    }
  }
  // homeTable is either the child of departments or schools
  // they are unnecessary containers that get in the way, so remove them from
  // the DOM
  $('table#homeTable').unwrap();
  // page will not center unless homeTable is given a definite width
  $('table#homeTable').css('width', schoolsFinalWidth);
  
  // Add a click event listener to all departments to load that department's
  // courses from the API
  $('department').click(function() {
    var dept = $(this);
    nsYacs.searchbar.value = dept.children('department-code').html();
    loadCourses("/api/v5/courses.xml?department_id=" +
  		dept.children('department-id').html());
      
  });
}

// Anything that has to be done when loading up the front page.
function loadHomePage() {
  clearForNewPage();
  doAjaxRequest("/api/v5/departments.xml", function(response) {
    nsYacs.contentContainer.innerHTML = response;
    setupHomePage();
  });
}

// Once a courses XML has been loaded into div#content, do any other steps
// needed to crunch it into presentable form.
function setupCourses() {
  formatSearchResults();

  // mark any sections that are already in the selected array with .selected
  // class (used in revisiting pages)
  $('section').each(function(i, section) {
    var sid = $(section).find('section-id').html();
    if (nsUser.hasSelection(sid)) {
      $(this).addClass('selected');
    }
  });
  
  // bind section storing function to clicks
  $('section').click(function(event) {
    var sid = $(this).find('section-id').html();
    // care more about the data - so use that to determine how to change
    // the styling; i.e. if the id is in the array, we will always deselect it
    // regardless of whether it was being rendered as selected or not
    if(nsUser.removeSelection(sid)) {
      // index is real, section is selected, deselect it
      $(this).removeClass('selected');
    }
    else {
      // section is not selected, select it and add it to the array
      nsUser.addSelection(sid);
      $(this).addClass('selected');
    }
    // don't bubble up to the course click handler!
    event.stopPropagation();
  });
  
  // courses can also be clicked
  // if a course is clicked and all sections are selected, deselect all
  // sections. Otherwise, select all sections.
  $('course').click(function(event) {
    // we are guaranteed that the user clicked on the course and not a section
    var allSectionsSelected = true;
    var selections = nsUser.getSelections();
    $(this).find('section-id').each(function(i, sid) {
      // if a section id cannot be found in the selected array, they cannot
      // all be selected
      sid = $(sid).html();
      if(selections.indexOf(sid) < 0) {
  	   allSectionsSelected = false;
  	   return false; // break the .each() loop
      }
    });

    $(this).find('section').each(function(i, section) {
      var sid = $(section).find('section-id').html();
      if(allSectionsSelected) {
      	nsUser.removeSelection(sid);
      	$(section).removeClass('selected');
      }
      else {
      	nsUser.addSelection(sid);
      	$(section).addClass('selected');
      }
    });
  });
}

// Anything that has to be done when loading up the courses/search results.
// The string argument is the literal API request that will be made, unchanged.
// If performing a search, you should call searchToQuery first.
function loadCourses(apiString) {
  clearForNewPage();
  doAjaxRequest(apiString, function(response) {
    nsYacs.contentContainer.innerHTML = response;
    setupCourses();
  });
}

/* Given a search string (what the user entered in the search bar), restructure
   it as a query string for the courses API.
   If anyone decides to implement a more intelligent search, the code for
   parsing things like "Tuesday class at 4" will go in here.
   The courses API expects a page request structured like
   /api/v5/courses?q=BIOL+1010+Hardwick. This is responsible for providing
   everything after the "q=".
   Possible improvement: let users quote multiword strings
*/
function searchToQuery(searchString) {
  var searchTerms = searchString.split(" ");
  var query = "";
  var first = true;
  for(var i=0; i<searchTerms.length; i++) {
    var term = searchTerms[i];
    if(term.length != 0) { // ignore multiple spaces creating "" terms
      if(first) {
	first = false;
      } else {
	query += "+";
      }
      query += term;
    }
  }
  return query;
}

/* Schedule loading function
   TODO: rewrite this
*/
function loadSchedules() {
  // If nothing is selected, take no action
  selectionsRaw = nsUser.getSelectionsRaw();
  if (selectionsRaw.length < 1) return;

  clearForNewPage();

  /* Temporary redirect (for experimenting with the CSS) *
  doAjaxRequest("sampleSchedule.html", function(response) {
    $('div#content').html(response);
  });
  return;
  */

  
  // Construct the API request string that will be passed
  // expects a comma-delimited list of numeric section IDs
  var schedURL = "/api/v5/schedules.json?section_ids=" + selectionsRaw;

  // Get the schedules as a JSON object.
  doAjaxRequest(schedURL, function(response) {
    var allSchedulesArray = (JSON.parse(response)).schedules;

    // Test for no schedules
    if(allSchedulesArray.length === 0) {
      $('div#content').html('<div class="error">No schedules are available for your selection of courses.</div>');
      return;
    }
    
    var weeklySchedule =
      convertPeriodsToHTML(convertSchedToPeriods(allSchedulesArray[0]));
    
    $('div#content').html('<div id="scheduleTable">'+weeklySchedule+'</div>');
  });
}


/* Helper function to determine whether a given time is a multiple of 30
   minutes */
function is30Min(time) {
  return (time % 30) === 0;
}


/* Helper function to return the next multiple of 30 minutes
   If the given time is already a multiple of 30 minutes, return it. */
function next30Min(time) {
  if(is30Min(time)) return time;
  return (time + 30 - (time % 30));
}

/* Helper function .......
   currently converts from miltime to number of minutes since midnight in addition to rounding to nearest 5 min, this may change (TODO) */
function roundTo5Min(milTime) {
  var min = Math.floor(milTime/100)*60 + (milTime % 100);
  return Math.round(min/5)*5;
}


/* Helper function to calculate the height in pixels of the difference between
   two times.
   Each minute is 0.8 pixels, plus 1 pixel for every 30-minute interval which
   is fully spanned by the given times (start is before it and end is after it.)
*/
function getHeight(startTime, endTime) {
  var timeDiff = endTime-startTime;
  var intervals = Math.floor((timeDiff)/30);
  var remainderTime = startTime+(intervals*30);
  var nextInterval = next30Min(remainderTime);
  if(nextInterval < endTime) {
    intervals++;
  }
  if(is30Min(startTime))
    intervals--; // exact 30min start/end times correction
  return ((timeDiff*4)/5) + intervals; 
}


/* Given a JSON object representing a single schedule from the API,
   transform it into an array of ordered arrays of periods.
   The larger array has 7 elements and represents the week. Each sub-array
   should be a list of all periods in that day, arranged by their start times.
*/
function convertSchedToPeriods(schedData) {
  var week = [];
  // days must be initialized separately so they don't all refer to the same
  week[0] = []; week[1] = []; week[2] = []; week[3] = []; week[4] = [];
  week[5] = []; week[6] = [];

  // identifies which course a period belongs to
  // (used to color all periods of a course the same color)
  var courseCtr = 1; 

  for (var sect of schedData.sections) {
    // assume the length of periods_start is the same as periods_end,
    // periods_type and periods_day. (else it's invalid)
    
    for (var i=0; i<sect.periods_start.length; ++i) {
      var period = { // the current period getting added into the structure
	day       : sect.periods_day[i],
	start     : roundTo5Min(sect.periods_start[i]),
	end       : roundTo5Min(sect.periods_end[i]),
	//prof      : sect.instructors,
	code      : sect.department_code,
	courseNum : sect.course_number,
	sectNum   : sect.name, // Should probably be a better term than "name"
	                       // but that's a problem with the API
	type      : sect.periods_type[i],
	title     : sect.course_name,
	schedNum  : courseCtr
      };
      
      // use a crude insertion sort based on start time (data set is small)
      var inserted = false;
      for(var j=0; j<week[period.day].length; ++j) {
	if(week[period.day][j].start > period.start) {
	  // insert it into week[period.day] before the jth element
	  week[period.day].splice(j, 0, period);
	  inserted = true;
	  break;
	}
      }
      if(!inserted) {
	// period is later than anything else, or list is empty
	week[period.day].push(period);
      }
    }
    courseCtr++;
  }
  return week;
}

/* Given the array of arrays of periods returned from convertSchedToPeriods,
   convert it into a HTML string which will represent it as a schedule. */
function convertPeriodsToHTML(week) {
  // make sure week is valid
  if(week.length != 7) {
    return false;
  }
  
  // get earliest start/latest end for the week (both in days and hours)
  var earliestStart = 2359;
  var latestEnd = 0;
  var earliestDayWithPeriod = undefined;
  var latestDayWithPeriod;
  for(var i=0; i<7; ++i) {
    var thisDay = week[i]; // current array of periods (within one day)
    if(thisDay.length > 0) {

      if(earliestDayWithPeriod === undefined)
	earliestDayWithPeriod = i;

      if(thisDay[0].start < earliestStart)
	earliestStart = thisDay[0].start;
      
      if(thisDay[thisDay.length-1].end > latestEnd)
	latestEnd = thisDay[thisDay.length-1].end;

      latestDayWithPeriod = i;
    }
  }
  // extend them to nearest hours on either side
  // perhaps change this to half-hours later (TODO)
  earliestStart = 60 * Math.floor(earliestStart/60);
  latestEnd = 60 * Math.ceil(latestEnd/60);

  var weekHTML = '';
  for(var i=earliestDayWithPeriod; i<=latestDayWithPeriod; ++i) {
    if(week[i].length === 0) {
      // TODO: fill entire thing with empty <li>s
      continue;
    }
    /* Strategy:
       fill in empty <li>s before a period (adjust the height of the first one
       if the difference between currTime and the next 30 minutes is less than
       30 minutes) and increment currTime by 30 minutes until the difference
       between currTime and the period start time is less than 30 minutes.
       
       Then, if this difference is nonzero, add a spacer li (which will have
       no bottom border) with a custom height to fill the space until the course
       begins.
       If the difference is zero, do nothing (all space will have been filled
       by the empty <li>s).
       
       Then, add the <li> for the course, with all its text (maybe broken up
       with <p> tags TODO). This will have a course class defined by the
       "course" field of the period and a custom height in pixels calculated
       by the following:
       (Total time in minutes)*0.8 +
       (Number of multiples of 30 minutes spanned)
       
       If the period ends on a multiple of 30 minutes, add the "end30" class to
       it, which will give it a bottom border.

       Set currTime to this period's end time.
    */
       
    var columnHTML = '<ul><li class="heading">'+nsYacs.weekdayNames[i]+'</li>';
    var currTime = earliestStart;
    for(var period of week[i]) {

      // step 1: fill in empty <li>s before period (these get bottom borders)
      if(period.start - currTime >= 30) {
	// first one may be different
	var nextInterval = next30Min(currTime);
	if(currTime != nextInterval) {
	  columnHTML +=
	  '<li style="height:'+getHeight(currTime, nextInterval)+'px"></li>';
	  currTime = nextInterval;
	}
	for(; period.start - currTime >= 30; currTime += 30) {
	  columnHTML += '<li></li>';
	}
      }

      // step 2: add a spacer li (no border) if there is still a time gap
      if(period.start - currTime > 0) {
	columnHTML += '<li class="spacer" style="height:' +
	  getHeight(currTime, period.start) + 'px"></li>';
      }

      // step 3: add the actual course
      var classes = 'course c' + period.schedNum;
      var courseHeight = getHeight(period.start, period.end);
      if(is30Min(period.endTime)) {
	classes += ' end30';
      }
      columnHTML += '<li class="' + classes + '" style="height:' +
	courseHeight + 'px">' + getCourseText(period) + '</li>';

      // step 4: set currTime
      currTime = period.end;
    }
    // add extra empty <li> after the last course until latestEnd
    // basically step 1 except with endTime instead of period.start
    if(latestEnd - currTime >= 30) {
      // first one may be different
      var nextInterval = next30Min(currTime);
      if(currTime != nextInterval) {
	columnHTML +=
	'<li style="height:'+getHeight(currTime, nextInterval)+'px"></li>';
	currTime = nextInterval;
      }
      for(; latestEnd - currTime >= 30; currTime += 30) {
	columnHTML += '<li></li>';
      }
    }
    // then, if there's any time left between currTime and latestEnd:
    if(latestEnd - currTime > 0) {
      // less than 30 minutes between currTime and latestEnd
      columnHTML +=
      '<li style="height:'+getHeight(currTime, latestEnd)+'px"></li>';
    }
    

    columnHTML += '</ul>';
    weekHTML += columnHTML;
  }
  return weekHTML;
}

/* Given a period, return the text that should display in its schedule box. */
function getCourseText(period) {
  // One line of text per 30 minutes in the class.
  var lines = Math.floor((period.end-period.start)/30);
  var basetext = period.code + '-' + period.courseNum + '-' + period.sectNum
    + ' ' + period.type;
    
  if(lines < 2) {
    // one line of text, make it count
    return basetext;
  }
  else {
    // TODO: truncate string according to the number of lines that can be used
    return '<p>'+basetext+'</p>'+'<p>'+period.title;
  }
}


/* Setup function. Initializes all data that needs to be used by this script,
   and adds any necessary event listeners. */
function setupPage() {
  // Initialize all variables in the yacs namespace
  nsYacs.contentContainer = document.getElementById("content");
  nsYacs.homeButton = document.getElementById("page-title");
  nsYacs.schedButton = document.getElementById("schedule-btn");
  nsYacs.searchbar = document.getElementById("searchbar");

  // Add click event to the YACS button
  nsYacs.homeButton.addEventListener("click", loadHomePage);

  // Add click event to the schedule button
  nsYacs.schedButton.addEventListener("click", loadSchedules);

  //Add enter key listener to the searchbar
  nsYacs.searchbar.addEventListener("keyup", function(event) {
    if(event.keyCode === 13) {
      var searchURL = "/api/v5/courses.xml?q="+
	searchToQuery(nsYacs.searchbar.value);
      alert(searchURL);
      loadCourses(searchURL);
    }
  });
  
  // Load the default home page
  loadHomePage();
}

// Only actually run this when the page finishes loading
document.addEventListener("DOMContentLoaded", setupPage, false);
