/**
 * Frontier JQuery Full Calendar Plugin.
 *
 * June 1st, 2010 - v1.0 - Initial version.
 *
 * Seth Lenzi
 * slenzi@gmail.com
 * lenzi@jimmy.harvard.edu
 *
 * Dependencies:
 *
 * This plugin requires the following javascript libraries. They are in the /lib folder
 * that should have come with this plugin. Make sure to inlcude them in your HTML (before
 * you include this plugin.)
 *
 * 1) jshashtable.js
 *    Tim Down
 *    http://code.google.com/p/jshashtable/
 *    http://www.timdown.co.uk/jshashtable/index.html
 *
 */ 
(function($) {

	// keep track of options for each instance
	var allOptions = new Array();
	
	// using jshashset.js library
	var myCalendars = new Hashtable();
	
	/**
	 * String startsWith function. 
	 */
	String.prototype.startsWith = function(str){
		return (this.match("^"+str)==str);
	}
	
	/**
	 * An agenda object to store data for a single agenda item on the calendar.
	 *
	 * An agenda item may wrap weeks so it will have more than one <div/> element to render.
	 *
	 * @param title		- (String) - The title to be displayed on the agenda <div/>. This is what users will see on
	 *								 the calendar agenda item along with the start and end dates.
	 *
	 * @param startDate - (Date) - The date the agenda item starts.
	 *
	 * @param endDate   - (Date) - The date the agenda item ends.
	 *
	 * @param hashData  - (Hashtable from jshashtable.js) - A Hashtable that contains all data for the agenda item.
	 */	
	function CalendarAgendaItem(title,startDate,endDate,hashData) {
		
		// a unique ID to identify this agenda item. The Calendar will use this internal ID to locate this agenda item for various purposes.
		this.id = 0;
		
		this.titleValue = title; 
		this.startDt = startDate;
		this.endDt = endDate;
		
		// using jshashset.js library
		// an agenda item can store arbitrary data. we have no idea what the user will want to
		// store so we give them a hashtable so they can store whatever.
		this.agendaData = hashData;
		
		// set the id. this ID is used by the Calendar object
		this.setAgendaId = function(agendaId){
			this.id = agendaId;
		};
		
		// get the id. this ID is used by the Calendar object
		this.getAgendaId = function(){
			return this.id;
		};

		this.getStartDate = function(){
			return this.startDt;
		};
		
		this.getEndDate = function(){
			return this.endDt;
		};

		this.getTitle = function(){
			return this.titleValue;
		};
		
		/**
		 * store some data in the agenda item
		 *
		 * @param key   - (Object) - The key for the data.
		 * @param value - (Object) - The data to store.
		 */
		this.addAgendaData = function(key,value){
			this.agendaData.put(key,value);
		};
		
		/**
		 * Get some data in the agenda item
		 *
		 * @param key - (Object) - The key used to lookup the item.
		 * @return      (Object) - The data that was stored, or null.
		 */
		this.getAgendaData = function(key){
			return this.agendaData.get(key);
		};

		this.toString = function(){
			var s = "Title: " + this.titleValue + "\n";
			s += "Start Date: " + this.startDt + "\n";
			s += "End Date: " + this.endDt + "\n";
			if(this.agendaData != null && this.agendaData.size() > 0){
				var keys = this.agendaData.keys();
				for(var keyIndex = 0; keyIndex < keys.length; keyIndex++){
					var keyName = keys[keyIndex];
					var val = this.getAgendaData(keyName);
					s += keyName + ": " + val + "\n";
				}
			}
			return s;
		};
	
	};

	/**
	 * One day cell in the calendar.
	 *
	 * @param jqyObj - (JQuery object) - Reference to the day cell <div/> element.
	 */
	function CalendarDayCell(jqyObj) {
		
		// jquery object that reference one day cell <div/> 
		this.jqyObj = jqyObj;
		
		// A Date object with the year, month, and day set for this day cell.
		this.date = null;
		
		/*
		each agenda item has it's own position on the day cell, starting at 0 for the first and going up (2,3,4,etc...)
		in this hash we store flags so we can tell if a position is already being taken up by another agenda item.
		if agendaRenderPositionsHash.get(0) == null or false than that position is open
		if agendaRenderPositionsHash.get(0) == true than that position is taken.
		keys are integers, values are Booleans.
		*/
		this.agendaRenderPositionsHash = new Hashtable();
		
		/**
		 * Clears html for this day cell <div/> and resets the agenda rendering position hash.
		 */
		this.clearAgendaPositions = function(){
			this.clearHtml();
			this.agendaRenderPositionsHash = new Hashtable();
		};		
		
		/**
		 * Mark if an agenda rendering position is open or closed. Should be marked open
		 * if there is no agenda item being rendered in that position. Should be marked
		 * closed if there is an agenda item being rendered in that position.
		 *
		 * @param index - integer - The position index, e.g. 0, 1, 2, etc.
		 * @param isOpen - Booolean object - True if that position is open, false otherwise.
		 */
		this.setAgendaPositionFlag = function(index,isOpen){
			if(isOpen){
				this.agendaRenderPositionsHash.put(index,new Boolean(false));
			}else{
				this.agendaRenderPositionsHash.put(index,new Boolean(true));
			}
		};
		
		/**
		 * Check if a rendering position is open or taken.
		 *
		 * @param - integer - position index.
		 * @return - true if the position is open, false if there is an agenda item in that position.
		 */
		this.isAgendaPositionOpen = function(index){
			if(index == null){
				return false;
			}
			var b = this.agendaRenderPositionsHash.get(index);
			if(b == null || b == false){
				return true;
			}
			return false;
		};
		
		/**
		 * Returns the index of the first open agenda postion. This is the first open postion
		 * that a potential new agenda item can be rendered on this day cell.
		 *
		 * @return integer - first open powition
		 */
		this.getFirstOpenAgendaPosition = function(){
			if(this.agendaRenderPositionsHash.size() == 0){
				return 0;
			}
			var position = 0;
			while(!isAgendaPositionOpen(position)){
				position++;
			}
			return position;
		};
		
		/**
		 * set the date for this day cell
		 *
		 * @param Date object with year, month, and day set.
		 */
		this.setDate = function(date){
			this.date = date;
		};		
		
		/**
		 * get the date for this day cell
		 *
		 * @return Date object.
		 */
		this.getDate = function(){
			return this.date;
		};
		
		/*
		width, not inlcuding padding. @see jquery.width() method
		*/
		this.getWidth = function(){
			return this.jqyObj.width();
		};
		
		/*
		width, inlcuding paddings @see jquery.innerWidth() method
		*/
		this.getInnerWidth = function(){
			return this.jqyObj.innerWidth();
		};

		/*
		return inner width plus width of left & right border
		*/
		this.getInnerWidthPlusBorder = function(){
			return this.jqyObj.outerWidth();
		};
		
		/*
		get height of cell
		*/
		this.getHeight = function(){
			return this.jqyObj.height();
		};

		/*
		get x coord of upper left corner
		*/
		this.getX = function(){
			return this.jqyObj.position().left;
		};
		
		/*
		get y coord of top left corner
		*/
		this.getY = function(){
			return this.jqyObj.position().top;
		};

		/*
		set html
		*/
		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		/*
		append html
		*/
		this.appendHtml = function(htmlData){
			this.jqyObj.append(htmlData);
		};

		/*
		clear html
		*/
		this.clearHtml = function(){
			this.setHtml("");
		};
		
		/*
		get html
		*/
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		/*
		set css value
		*/
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		/*
		get css value
		*/
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		/*
		set attribute value
		*/
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		/*
		get attribute value
		*/
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};

		/*
		add a click event callback function to this day cell.
		the event object from the click will have the day object and date for the day
		e.g. var dayDate = eventObj.data.calDayDate;
		*/
		this.addClickHandler = function(handler){
			this.jqyObj.bind(
				"click",
				{
					//calDayObj:this,
					calDayDate:this.date
				},
				handler
			);
		};
	};

	/**
	 * One header cell in the calendar header.
	 *
	 * @param jqyObj - (JQuery object) - Reference to a header cell <div/> element.
	 */
	function CalendarHeaderCell(jqyObj) {
		
		// jquery object that reference one header cell <div/> in the header <div/> 
		this.jqyObj = jqyObj;
		
		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};
		
		this.getX = function(){
			return this.jqyObj.position().left;
		};
		
		this.getY = function(){
			return this.jqyObj.position().top;
		};
		
		// get height of cell
		this.getHeight = function(){
			return this.jqyObj.height();
		};		

		// width, not inlcuding padding
		this.getWidth = function(){
			return this.jqyObj.width();
		};
		
		// width, inlcuding padding
		this.getInnerWidth = function(){
			return this.jqyObj.innerWidth();
		};

		// return inner width plus width of left & right border
		this.getInnerWidthPlusBorder = function(){
			return this.jqyObj.outerWidth();
		};
		
	};
	
	/**
	 * One week header cell in the calendar week header.
	 *
	 * @param jqyObj - (JQuery object) - Reference to a week header cell <div/> element.
	 */
	function CalendarWeekHeaderCell(jqyObj) {
		
		// jquery object that reference one week header cell <div/> in the week header <div/> 
		this.jqyObj = jqyObj;
		
		// A Date object with the year, month, and day set for this day cell.
		this.date = null;

		/**
		 * set the date for this day cell
		 *
		 * @param Date object with year, month, and day set.
		 */
		this.setDate = function(date){
			this.date = date;
		};		
		
		/**
		 * get the date for this day cell
		 *
		 * @return Date object.
		 */
		this.getDate = function(){
			return this.date;
		};		
		
		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};
		
		this.getX = function(){
			return this.jqyObj.position().left;
		};
		
		this.getY = function(){
			return this.jqyObj.position().top;
		};
		
		// get height of cell
		this.getHeight = function(){
			return this.jqyObj.height();
		};		

		// width, not inlcuding padding
		this.getWidth = function(){
			return this.jqyObj.width();
		};
		
		// width, inlcuding padding
		this.getInnerWidth = function(){
			return this.jqyObj.innerWidth();
		};

		// return inner width plus width of left & right border
		this.getInnerWidthPlusBorder = function(){
			return this.jqyObj.outerWidth();
		};
		
		// add a click event callback function to this day cell.
		// the event object from the click will have the day object and date for the day
		// e.g. var dayDate = eventObj.data.calDayDate;
		this.addClickHandler = function(handler){
			this.jqyObj.bind(
				"click",
				{
					calDayDate:this.date
				},
				handler
			);
		};		
		
	};	

	/**
	 * Calendar header object. Contains a collection of CalendarHeaderCell objects.
	 *
	 * @param jqyObj - (JQuery object) - Reference to the header <div/> element.
	 */
	function CalendarHeader(jqyObj) {
		
		// jquery object that reference the calendar header <div/>
		this.jqyObj = jqyObj;
		
		// all CalendarHeaderCell objects in the header
		this.headerCells = new Array();
		
		// append CalendarHeaderCell object to the header
		this.appendCalendarHeaderCell = function (calHeaderCell){
			// push is not supported by IE 5/Win with the JScript 5.0 engine
			this.headerCells.push(calHeaderCell);		
			this.jqyObj.append(calHeaderCell.jqyObj);
		};
		
		// returns an array of CalendarHeaderCell objects
		this.getHeaderCells = function(){
			return this.headerCells;
		}

		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};
		
		// set width of the calendar header <div/>
		this.setWidth = function(w){
			this.jqyObj.width(w);
		}

		// return the sum of all the header cell widths (inlcuding their padding and borders).
		// this method does not inlcude the width of the header <div/>. See getInnerWidth()
		/*
		this.getWidth = function(){
			var width = 0;
			if(this.headerCells != null && this.headerCells.length > 0){
				for(var headIndex = 0; headIndex < this.headerCells.length; headIndex++){
					width += this.headerCells[headIndex].getInnerWidthPlusBorder();
				}
			}
			return width;
		};
		*/
		
		/*
		// same as getWidth put also includes padding of the header <div/>
		this.getInnerWidth = function(){
			return this.getWidth() + this.getLeftPaddingWidth() + this.getRightPaddingWidth();
		};
		
		// same as getInnerWidth but also inlcudes the left & right border of the header <div/>
		this.getInnerWidthPlusBorder = function(){
			return this.getInnerWidth() + getLeftBorderWidth() + getRightBorderWidth();
		};
		*/
		
	};
	
	/**
	 * Calendar week header object. The row above each CalendarWeek object. Shows the day numbers.
	 * Contains a collection of CalendarWeekHeaderCell objects.
	 *
	 * @param jqyObj - (JQuery object) - Reference to the week header <div/> element.
	 */
	function CalendarWeekHeader(jqyObj) {
		
		// jquery object that reference the week header <div/>
		this.jqyObj = jqyObj;
		
		// all CalendarWeekHeaderCell objects in the week header
		this.weekHeaderCells = new Array();
		
		// append a CalendarWeekHeaderCell object
		this.appendCalendarWeekHeaderCell = function (weekHeaderCell){
			// push is not supported by IE 5/Win with the JScript 5.0 engine
			this.weekHeaderCells.push(weekHeaderCell);
			this.jqyObj.append(weekHeaderCell.jqyObj);
		};
		
		// returns an array of CalendarWeekHeaderCell objects
		this.getHeaderCells = function(){
			return this.weekHeaderCells;
		}
		
		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};

		// set width of the calendar week header <div/>
		this.setWidth = function(w){
			this.jqyObj.width(w);
		}		
	};	
	
	/**
	 * Calendar week object. One row in the calendar (7 days). Contains a collection of CalendarDayCell objects.
	 *
	 * @param jqyObj - (JQuery object) - Reference to the week <div/> element.
	 */
	function CalendarWeek(jqyObj) {
		
		// jquery object that reference the week <div/>
		this.jqyObj = jqyObj;
		
		// all CalendarDayCell objects in the week
		this.days = new Array();
		
		// append a CalendarDayCell object
		this.appendCalendarDayCell = function (calDayCell){
			// push is not supported by IE 5/Win with the JScript 5.0 engine
			this.days.push(calDayCell);
			this.jqyObj.append(calDayCell.jqyObj);
		};
		
		// returns an array of CalendarDayCell objects
		this.getDays = function(){
			return this.days;
		}
		
		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};

		// set width of the calendar header <div/>
		this.setWidth = function(w){
			this.jqyObj.width(w);
		}		
	};	

	/**
	 * Calendar object. Initializes to the current year & month.
	 *
	 * @param jqyObj - (JQuery object) - Reference to the calendar <div/> element.
	 */
	function Calendar() {
		
		// this value is set when Calendar.initialize(calElm,date) is called
		this.jqyObj = null;
		
		// reference to the CalendarHeader object
		this.calHeaderObj = null;
		
		// all CalendarWeek objects in the calendar
		this.weeks = new Array();
		
		// all buildCalendarWeekHeader objects in the calendar
		this.weekHeaders = new Array();	
		
		// by default the calendar will display the current month for the current year
		this.displayDate = new Date();
		
		// hash for storing agenda items. Uses jshashtable.js library. See notes at top of file.
		this.agendaItems = new Hashtable();
		
		/*
		we already store all the CalendarDayCell objects inside the CalendarWeek objects
		but we use this hash because in many instances we want to be able to grab a
		particular day object as quickly as possible.
		keys = strings in the form of YYYYMMDD
		values = CalendarDayCell objects
		*/
		this.dayHash = new Hashtable();
		
		// prefix value for day cell IDs
		//this.dayPrefixId = "CAL";
		
		// the callback function that's triggered when users click a day cell
		this.clickEvent_dayCell = null;
		// the callback function that's triggered when users click an agenda item
		this.clickEvent_agendaCell = null;

		// each CalendarAgendaitem added to this calendar gets an ID. We'll increment this ID for each agendar item added.
		this.agendaId = 1;
		
		// default values...
		this.calBorder					= 1				// width of calendar border
		this.calBorderColor				= "#000000";	// color of border arounc entire calendar
		this.cellMargin 				= 0;			// margin of all cells
		this.cellPadding 				= 0;			// padding of all cells
		this.cellBorderWidth 			= 1;			// border of all cells
		//this.dayCellHeight 				= 80;			// heigh of a day cell
		this.dayCellHeaderCellHeight 	= 17;			// height of day cell header cell (in week header)
		this.headerCellHeight 			= 17;			// height of header cell (in header)
		this.agendaItemHeight 			= 15;			// height of agend item cell
		
		// 7 left borders + 1 right border (left + right)
		this.cellBorderTotal 		= this.cellBorderWidth * (Calendar.dayNames.length + 1);
		
		// padding for 7 cells (left + right)
		this.cellPaddingTotal 		= (this.cellPadding * 2) * Calendar.dayNames.length;
		
		/**
		 * Builds the calendar data. This function msut be called after new Calendar() in created
		 *
		 * @param calElm - A jquery object for the calendar <div/> element.
		 * @param date - A datejs Date object. The calendar will be set to the year and month of the date.
		 * @param dayCellClickHandler - A Function that's triggered when users click a day cell
		 * @param agendaCellClickHandler - A Function that's triggered when users click an agenda item
		 */
		this.initialize = function(calElm,date,dayCellClickHandler,agendaCellClickHandler){
			
			this.jqyObj = calElm;
			this.displayDate = date;
			this.clickEvent_dayCell = dayCellClickHandler;
			this.clickEvent_agendaCell = agendaCellClickHandler;
			
			this.do_init();
			
		};
		
		/**
		 * Called by Calendar.initialize(). The real work happens here.
		 */
		this.do_init = function(){
		
			// clear header & weeks & week headers but don't clear agenda items.
			this.clear(false);
			
			// build header
			var calHeaderCell;
			var calHeader = this.buildCalendarHeader();
			for(var dayIndex = 0; dayIndex < Calendar.dayNames.length; dayIndex++){
				calHeaderCell = this.buildCalendarHeaderCell();
				calHeaderCell.setHtml(Calendar.dayNames[dayIndex]);
				calHeader.appendCalendarHeaderCell(calHeaderCell);
			}
			this.addHeader(calHeader); 			
			
			// initialize some variables we'll use for building the weeks and week headers
			
			// year number for this date
			var currentYearNum = this.getCurrentYear();
			// month number for this date
			var currentMonthNum = this.getCurrentMonth();
			// number of days in this month
			var daysInCurrentMonth = this.getDaysCurrentMonth();
			// number of days in the previous month
			var daysInPreviousMonth = this.getDaysPreviousMonth();
			// number of days in the next month
			var daysInNextMonth = this.getDaysNextMonth();
			// Date object set to first day of the month
			var dtFirst = new Date(this.getCurrentYear(),this.getCurrentMonth(),1,0,0,0,0);
			// Date object set to last day of the month
			var dtLast = new Date(this.getCurrentYear(),this.getCurrentMonth(),daysInCurrentMonth,0,0,0,0);
			// index within the week of the first day of the month
			var firstDayWkIndex = dtFirst.getDay();
			// inidex within the week of the last day of the month
			var lastDayWkIndex = dtLast.getDay();

			// number of day cells that appear on the calendar (days for current month + any days from 
			// previous month + any days from next month.) No more than 42 days, (7 days * 6 weeks.)
			var totalDayCells = daysInCurrentMonth + firstDayWkIndex;
			if(lastDayWkIndex > 0){
				totalDayCells += Calendar.dayNames.length - lastDayWkIndex - 1;
			}
			// number of week cells (rows) that appear on the calendar
			// this is also the number of week headers since each week has a header
			var numberWeekRows = Math.ceil(totalDayCells / Calendar.dayNames.length);

			// the day number that appears in each week header cell
			var dayNum = 1;
			// the Date object to be store in each CalendarDayCell object & CalendarWeekHeaderCell object
			// when users click a day cell or week header cell they can get access to this date cause we 
			// store it in the elements data (see jquery data() function)
			var dt = null;
			
			// when we display a month we can see a few days from the previous month on the calendar. This is the
			// day number of the earliest day we can see of the previous month.
			var firstDayPrevMonth = (daysInPreviousMonth - firstDayWkIndex) + 1;
			
			// build CalendarWeekHeader & CalendarWeek object for the first week row in the calenar
			var calDayCell;
			var calWeekObj;
			var calWeekHeaderCellObj;
			var calWeekHeaderObj;			
			calWeekObj = this.buildCalendarWeek(); // week <div/>
			calWeekHeaderObj = this.buildCalendarWeekHeader(); // week header <div/>
			for(var dayIndex = 0; dayIndex < Calendar.dayNames.length; dayIndex++){
				calDayCell = this.buildCalendarDayCell();
				calWeekHeaderCellObj = this.buildCalendarWeekHeaderCell();
				if(dayIndex < firstDayWkIndex){
					// previous month
					dt = new Date(currentYearNum,(currentMonthNum-1),firstDayPrevMonth,0,0,0,0);
					calDayCell.setDate(dt);
					calWeekHeaderCellObj.setDate(dt);
					calWeekHeaderCellObj.setHtml(firstDayPrevMonth);
					calDayCell.setCss("background-color","#cccccc");
					calWeekHeaderCellObj.setCss("background-color","#aaaaaa");
					calDayCell.setCss("color","#999999");
					calWeekHeaderCellObj.setCss("color","#333333");
					firstDayPrevMonth += 1;
				}else{
					// this month
					dt = new Date(currentYearNum,currentMonthNum,dayNum,0,0,0,0);
					calDayCell.setDate(dt);
					calWeekHeaderCellObj.setDate(dt);
					calWeekHeaderCellObj.setHtml(dayNum);
					dayNum += 1;
				}
				// add click event handler if the user specified one
				if(this.clickEvent_dayCell != null){
					calDayCell.addClickHandler(this.clickEvent_dayCell);
					calWeekHeaderCellObj.addClickHandler(this.clickEvent_dayCell);
				}
				calWeekHeaderObj.appendCalendarWeekHeaderCell(calWeekHeaderCellObj);
				calWeekObj.appendCalendarDayCell(calDayCell);
				// add our day cell to our hash so we can look it up quickly when we need to later.
				this.dayHash.put(
					(calDayCell.getDate().getFullYear() + "") + 
					(calDayCell.getDate().getMonth() + "") + 
					(calDayCell.getDate().getDate() + ""),
					calDayCell);
			}
			this.addWeekHeader(calWeekHeaderObj);
			this.addWeek(calWeekObj);
			
			// add middle weeks & week headers
			for(var weekIndex = 2; weekIndex < numberWeekRows; weekIndex++){
				calWeekObj = this.buildCalendarWeek(); // week <div/>
				calWeekHeaderObj = this.buildCalendarWeekHeader(); // week header <div/>
				for(var dayIndex = 0; dayIndex < Calendar.dayNames.length; dayIndex++){
					calDayCell = this.buildCalendarDayCell();
					calWeekHeaderCellObj = this.buildCalendarWeekHeaderCell();
					dt = new Date(currentYearNum,currentMonthNum,dayNum,0,0,0,0);
					calDayCell.setDate(dt);						
					calWeekHeaderCellObj.setDate(dt);
					calWeekHeaderCellObj.setHtml(dayNum);
					// add click event handler if the user specified one
					if(this.clickEvent_dayCell != null){
						calDayCell.addClickHandler(this.clickEvent_dayCell);
						calWeekHeaderCellObj.addClickHandler(this.clickEvent_dayCell);
					}									
					dayNum += 1;
					calWeekHeaderObj.appendCalendarWeekHeaderCell(calWeekHeaderCellObj);
					calWeekObj.appendCalendarDayCell(calDayCell);
					// add our day cell to our hash so we can look it up quickly when we need to later.
					this.dayHash.put(
						(calDayCell.getDate().getFullYear() + "") + 
						(calDayCell.getDate().getMonth() + "") + 
						(calDayCell.getDate().getDate() + ""),
						calDayCell);					
				}
				this.addWeekHeader(calWeekHeaderObj);
				this.addWeek(calWeekObj);
			}
			
			// when we display a month we can see a few days from the next month on the calendar. this
			// is the day number of the first day on the next month. Will always be 1.
			var nextMonthDisplayDayNum = 1;
			
			// add last week & last week header
			calWeekObj = this.buildCalendarWeek(); // week <div/>
			calWeekHeaderObj = this.buildCalendarWeekHeader(); // week header <div/>
			for(var dayIndex = 0; dayIndex < Calendar.dayNames.length; dayIndex++){
				calDayCell = this.buildCalendarDayCell();
				calWeekHeaderCellObj = this.buildCalendarWeekHeaderCell();
				if(dayNum <= daysInCurrentMonth){
					// this month
					dt = new Date(currentYearNum,currentMonthNum,dayNum,0,0,0,0);
					calDayCell.setDate(dt);						
					calWeekHeaderCellObj.setDate(dt);
					calWeekHeaderCellObj.setHtml(dayNum);	
				}else{
					// next month
					dt = new Date(currentYearNum,(currentMonthNum+1),nextMonthDisplayDayNum,0,0,0,0);
					calDayCell.setDate(dt);						
					calWeekHeaderCellObj.setDate(dt);
					calWeekHeaderCellObj.setHtml(nextMonthDisplayDayNum);				
					calDayCell.setCss("background-color","#cccccc");
					calWeekHeaderCellObj.setCss("background-color","#aaaaaa");
					calDayCell.setCss("color","#999999");
					calWeekHeaderCellObj.setCss("color","#333333");
					nextMonthDisplayDayNum += 1;
				}
				dayNum += 1;
				// add click event handler if the user specified one
				if(this.clickEvent_dayCell != null){
					calDayCell.addClickHandler(this.clickEvent_dayCell);
					calWeekHeaderCellObj.addClickHandler(this.clickEvent_dayCell);
				}
				calWeekHeaderObj.appendCalendarWeekHeaderCell(calWeekHeaderCellObj);
				calWeekObj.appendCalendarDayCell(calDayCell);
				// add our day cell to our hash so we can look it up quickly when we need to later.
				this.dayHash.put(
					(calDayCell.getDate().getFullYear() + "") + 
					(calDayCell.getDate().getMonth() + "") + 
					(calDayCell.getDate().getDate() + ""),
					calDayCell);				
			}
			this.addWeekHeader(calWeekHeaderObj);
			this.addWeek(calWeekObj);

			/*
			// height of all calendar elements
			var totalCalendarHeight = 
				(numberWeekRows * this.dayCellHeight) +  	   			// height of week rows
				(numberWeekRows * this.dayCellHeaderCellHeight) +  	   	// height of week header rows
				(numberWeekRows * (this.cellBorderWidth)) +  			// plus bottom borders (no top) of day cells.
				this.headerCellHeight + (this.cellBorderWidth * 2); 	// plus height of header cells and their top & bottom borders.
			// set height of calendar <div/>
			this.setCss("height",totalCalendarHeight+"px");
			*/
				
			// set border style
			this.setCss("border",this.calBorder+"px solid "+this.calBorderColor);
			this.setCss("padding","0px;");
			this.setCss("margin","0px;");

			// re-render all agenda items
			this.renderAgendaItems();
		
		};

		/**
		 * Re-renders all the agenda items stored in the calendar.
		 *
		 */
		this.renderAgendaItems = function(){
			
			// only render if we actually have some agenda items.
			if(this.agendaItems == null || this.agendaItems.size() == 0){
				return;
			}
			
			// get all CalendarAgendaItem objects from our Hashtable
			var itemArray = this.agendaItems.values();
			
			// loop through each CalendarAgendaItem and render it
			for(var itemIndex = 0; itemIndex < this.agendaItems.size(); itemIndex++){
				// CalendarAgendaItem object
				var agi = itemArray[itemIndex];
				this.renderSingleAgendaItem(agi);
			}
		
		};

		/**
		 * Renders the agenda item
		 *
		 * @param agi - CalendarAgendaItem - The agenda item to render.
		 */
		this.renderSingleAgendaItem = function(agi){
		
			if(agi == null){
				return;
			}
			if(this.weeks == null || this.weeks.length == 0){
				// no need to render if we don't have any week data. should never get here really...
				return;
			}			
			var title = agi.getTitle();
			var agendaStartDate = agi.getStartDate();
			var agendaEndDate = agi.getEndDate();
			if(agendaStartDate == null || agendaEndDate == null){
				// no agenda dates, can't render
				return;
			}
			// get the first visible day on the calendar (this might be from the previous month, or year!)
			var firstVisibleDay = null;
			var firstWeekDayArray = this.weeks[0].getDays();
			if(firstWeekDayArray != null && firstWeekDayArray.length > 0){
				firstVisibleDay = firstWeekDayArray[0];
			}
			// get the last day visible on the calendar (this might be from the next month, or year!)
			var lastVisibleDay = null;
			var lastWeekDayArray = this.weeks[this.weeks.length-1].getDays();
			if(lastWeekDayArray != null && lastWeekDayArray.length > 0){
				lastVisibleDay = lastWeekDayArray[lastWeekDayArray.length-1];
			}
			if(firstVisibleDay == null || lastVisibleDay == null){
				// calendar has no weeks or days... failed initialization? can't render anything!
				return;
			}
			var firstVisDt = firstVisibleDay.getDate();
			var lastVisDt = lastVisibleDay.getDate();
			if(DateUtil.daysDifferenceDirection(firstVisDt,agendaEndDate) < 0){
				// the agenda item is out of view. it's earlier on the calendar. no need to render.
				return;
			}
			if(DateUtil.daysDifferenceDirection(lastVisDt,agendaStartDate) > 0){
				// the agenda item is out of view. it's later on the calendar. no need to render.
				return;
			}				
			// looks like we need to render this agenda item!
			var firstRenderDate = null;
			var lastRenderDate = null;
			if(DateUtil.daysDifferenceDirection(firstVisDt,agendaStartDate) < 0){
				// the agenda start date is out of view (earlier on the calendar). The first day
				// we'll render for agenda item is the first visible day on the calendar.
				firstRenderDate = firstVisDt;
			}else if(DateUtil.daysDifferenceDirection(firstVisDt,agendaStartDate) == 0){
				// the agenda start date is the first visible date on the calendar.
				firstRenderDate = firstVisDt;
			}else{
				// the agenda start date is the first render date.
				firstRenderDate = agendaStartDate;
			}
			
			if(DateUtil.daysDifferenceDirection(lastVisDt,agendaEndDate) > 0){
				// the agenda end date is out of view (later on the calendar). The last
				// day we'll render for the agenda item is the last visible day on the calendar.
				lastRenderDate = lastVisDt;
			}else if(DateUtil.daysDifferenceDirection(lastVisDt,agendaEndDate) == 0){
				// the agenda end date is the last visible date on the calendar.
				lastRenderDate = lastVisDt;
			}else{
				// the agenda end date is the last render date.
				lastRenderDate = agendaEndDate;
			}			
		
			// if firstRenderDate & lastRenderDate are not in the same week than we'll have
			// to render multiple <div/>'s for this agenda item (one div for each week.)
			
			var firstDtIndex = firstRenderDate.getDay();
			var lastDtIndex = lastRenderDate.getDay();
			
			if((DateUtil.daysDifference(firstRenderDate,lastRenderDate) + firstDtIndex) > 6){
			
				// we need to create multiple <div> elements because the agenda item spans more than one week
			
				// create first <div> from firstRenderDate to the last day in the same week
				var displayMessage = "("+agi.getStartDate().toLocaleTimeString()+") " + agi.getTitle();
				var lastDaySameWeekDate = DateUtil.getLastDayInSameWeek(firstRenderDate);
				this.renderAgendaDivElement(
					displayMessage,
					this.getCalendarDayObjByDate(firstRenderDate),
					this.getCalendarDayObjByDate(lastDaySameWeekDate),
					true,
					false
				);
				// render the rest of the div elements till we get to the end
				displayMessage = agi.getTitle();
				while(DateUtil.daysDifferenceDirection(lastRenderDate,lastDaySameWeekDate) < 0){
					var firstDayNextWeekDate = DateUtil.getFirstDayNextWeek(lastDaySameWeekDate);	
					lastDaySameWeekDate = DateUtil.getLastDayInSameWeek(firstDayNextWeekDate);
					if(DateUtil.daysDifferenceDirection(lastRenderDate,lastDaySameWeekDate) < 0){
						// render div from firstDayNextWeekDate to lastDaySameWeekDate
						this.renderAgendaDivElement(
							displayMessage,
							this.getCalendarDayObjByDate(firstDayNextWeekDate),
							this.getCalendarDayObjByDate(lastDaySameWeekDate),
							false,
							false
						);						
					}else{
						// render div from firstDayNextWeekDate to lastRenderDate
						this.renderAgendaDivElement(
							displayMessage,
							this.getCalendarDayObjByDate(firstDayNextWeekDate),
							this.getCalendarDayObjByDate(lastRenderDate),
							false,
							true
						);						
					}
				}
			}else{
				// the <div/> to render for the agend item is all in the same week.
				//var displayMessage = "("+agi.getStartDate().getHours()+":"+agi.getStartDate().getMinutes()+") " + agi.getTitle();
				var displayMessage = "("+agi.getStartDate().toLocaleTimeString()+") " + agi.getTitle();				
				this.renderAgendaDivElement(
					displayMessage,
					this.getCalendarDayObjByDate(firstRenderDate),
					this.getCalendarDayObjByDate(lastRenderDate),
					true,
					true
				);
			}
			
		};
		
		/**
		 * Renders a absolute positioned <div/> element from the start day to the end day
		 * for the agenda item.
		 *
		 * @param displayMessage - (String) - Text to show in the agenda div.
		 *
		 * @param startDayObject - (CalendarDayCell) - The start day. This is where the <div/> will start.
		 *
		 * @param endDayObject - (CalendarDayCell) - The end day. This is where the <div/> will end.
		 *
		 * @param leftEnd - (true/false) - True if the left end of the div should be rounded, signifying that
		 *				                   this is the start date of the agenda item. False not to round it.
		 *
		 * @param rightEnd - (true/false) - True if the right end of the div should be rounded, signifying that
		 *				                   this is the start date of the agenda item. False not to round it.		 
		 */
		this.renderAgendaDivElement = function(
			displayMessage,startDayObject,endDayObject,leftEnd,rightEnd){
			
			if(displayMessage == null || startDayObject == null || endDayObject == null){
				return;
			}
		
			var startX = startDayObject.getX() + this.cellBorderWidth;
			var endX = endDayObject.getX() + this.cellBorderWidth + endDayObject.getWidth();
			var width = endX - startX;
			
			var spacerBetweenAgendaDivs = 1;
			
			// get the first open position for all the days where we can render our agenda item
			var firstOpenIndex = this.getFirstOpenAgendaPosition(startDayObject,endDayObject);
			
			var startY = startDayObject.getY() + // location of day cell
				(firstOpenIndex * this.agendaItemHeight) + // next location of agenda item
				(firstOpenIndex * spacerBetweenAgendaDivs); // plus a little spacing between each agenda item			
			
			// make sure the agenda div will fit, if not we need to show the "more" link in all the cells
			var dayCellY = startDayObject.getY();
			var dayCellH = startDayObject.getHeight();
			if( startY > ((dayCellY+dayCellH) - ((this.agendaItemHeight + spacerBetweenAgendaDivs)*2)) ){
				// don't render the agenda div, instead add a "more" link to each day cell
				
			}
			
			// add id of agenda item to day object so when users click
			
			// mark that this agenda position is now taken
			this.flagAgendaPosition(firstOpenIndex,startDayObject,endDayObject,false);
			
			var d = $("<div/>");
			
			d.css("position","absolute");
			d.css("left",startX+"px");
			d.css("top",startY+"px");					
			d.css("width",width+"px");
			d.css("height",this.agendaItemHeight+"px");
			d.css("overflow","hidden"); // don't want text creeping outside the <div/> into the next day...
			d.css("font","11px verdana, georgia, times, arial, helvetica, sans-serif");
			d.css("background-color","#445878");
			d.css("color","#ffffff");
			d.css("margin-top","0px");
			d.css("margin-bottom","0px");
			d.css("margin-left","0px");
			d.css("margin-right","0px");
			d.css("white-space","nowrap");
			// round corners for webkit & safari (poor IE :( )
			if(leftEnd){
				d.css("-moz-border-radius-bottomleft","3px");
				d.css("-moz-border-radius-topleft","3px");
				d.css("-webkit-border-bottom-left-radius","3px");
				d.css("-webkit-border-top-left-radius","3px");				
			}
			if(rightEnd){
				d.css("-moz-border-radius-topright","3px");
				d.css("-moz-border-radius-bottomright","3px");
				d.css("-webkit-border-top-right-radius","3px");
				d.css("-webkit-border-bottom-right-radius","3px");			
			}
			d.html(displayMessage);
			// the users click event should use event.stopPropagation() so the day cell click events are not triggered.
			if(this.clickEvent_agendaCell != null){
				d.bind('click',this.clickEvent_agendaCell);
			}			
			// change mouse cusor to pointer when hovering over agenda divs.
			d.hover(
				function() {
					$(this).css('cursor','pointer');
				},
				function() {
					$(this).css('cursor','auto');
				}
			);			
			
			startDayObject.appendHtml(d);
			
		};

		/**
		 * Sets the agenda renger position flag for start day, end day, and all days
		 * inbetween.
		 *
		 * @param index - integer - The agendar render position to set for all days.
		 * @param startDayObj - CalendarDayCell - The start day.
		 * @param endDayObj - CalendarDayCell - The end day.
		 * @param isOpen - boolean = true if this postion is open for ALL days from 
		 *                 start to end, false if they are ALL not open.
		 */
		this.flagAgendaPosition = function(index,startDayObj,endDayObj,isOpen){
			if(index == null || startDayObj == null || endDayObj == null || isOpen == null){
				return;
			}
			startDayObj.setAgendaPositionFlag(index,isOpen);
			var startDt = startDayObj.getDate();
			var endDt = endDayObj.getDate();
			var nextDt = DateUtil.getNextDay(startDt);
			while(DateUtil.daysDifferenceDirection(nextDt,endDt) >= 0){
				var nextDatObj = this.getCalendarDayObjByDate(nextDt);
				nextDatObj.setAgendaPositionFlag(index,isOpen);
				nextDt = DateUtil.getNextDay(nextDt);
			}			
		};
		
		/**
		 * Examines the agenda positions from start day to end day and finds
		 * the first index in which they all share the same open position.
		 *
		 * @param startDayObj - CalendarDayCell - The start day.
		 * @param endDayObj - CalendarDayCell - The end day.		 
		 */
		this.getFirstOpenAgendaPosition = function(startDayObj,endDayObj){
			if(startDayObj == null || endDayObj == null){
				// 0 is the default render index for a new CalendarDayCell object.
				return 0;
			}
			var openIndex = 0;
			while(!this.isAgendaPositionOpenForAllDays(openIndex,startDayObj,endDayObj)){
				openIndex += 1;
			}
			return openIndex;
		}
		this.isAgendaPositionOpenForAllDays = function(index,startDayObj,endDayObj){
			if(index == null || startDayObj == null || endDayObj == null){
				return false;
			}
			var open = startDayObj.isAgendaPositionOpen(index);
			if(!open){
				return false;
			}
			var startDt = startDayObj.getDate();
			var endDt = endDayObj.getDate();
			var nextDt = DateUtil.getNextDay(startDt);
			while(DateUtil.daysDifferenceDirection(nextDt,endDt) >= 0){
				var nextDatObj = this.getCalendarDayObjByDate(nextDt);
				open = nextDatObj.isAgendaPositionOpen(index);
				if(!open){
					return false;
				}
				nextDt = DateUtil.getNextDay(nextDt);
			}			
			return true;
		};
		
		/**
		 * Returns the CalendarDayCell object with the matching date: matching on year, month, and day.
		 *
		 * @param date - (Date) - A Date object with the year, month, and day set.
		 * @return A CalendarDayCell object with the matching date, or null.
		 */
		this.getCalendarDayObjByDate = function(date){
			if(date == null){
				return null;
			}
			if(this.dayHash == null || this.dayHash.size() == 0){
				return null;
			}
			var key = (date.getFullYear()+"") + (date.getMonth()+"") + (date.getDate()+"");
			return this.dayHash.get(key);
		};
		
		/**
		 * Set the calendar to the specified year & month.
		 * 
		 * @param date - A date object from the datejs library.
		 */
		this.setDisplayDate = function(date){

			// set the date
			this.displayDate = date;
			
			// re-initialize the calendar
			this.do_init();
			
			// resize
			this.resize();
		
		};
		
		/**
		 * Returns the calendars current date.
		 *
		 * @return A datejs Date object.
		 */
		this.getDisplayDate = function(){
			var dt = new Date(this.getCurrentYear(),this.getCurrentMonth(),this.getCurrentDay(),0,0,0,0);
			return dt;
		};

		/**
		 * Sets the calendar to the next month
		 */
		this.nextMonth = function(){
			var dt = new Date(0,0,1,0,0,0,0);
			if(this.displayDate.getMonth() == 11){
				dt.setFullYear(this.displayDate.getFullYear()+1);
				dt.setMonth(0);
			}else{
				dt.setFullYear(this.displayDate.getFullYear());
				dt.setMonth(this.displayDate.getMonth()+1);
			}
			this.setDisplayDate(dt);
		};
		
		/**
		 * Sets the calendar to the previous month
		 */
		this.previousMonth = function(){
			var dt = new Date(0,0,1,0,0,0,0);
			if(this.displayDate.getMonth() == 0){
				dt.setFullYear(this.displayDate.getFullYear()-1);
				dt.setMonth(11);
			}else{
				dt.setFullYear(this.displayDate.getFullYear());
				dt.setMonth(this.displayDate.getMonth()-1);
			}		
			this.setDisplayDate(dt);	
		};
		
		/**
		 * Builds a CalendarHeader object. This goes at the very top of the calendar and displays the day names.
		 * This object stores all the CalendarHeaderCell objects for the calendar header.
		 *
		 * @return a CalendarHeader object.
		 */
		this.buildCalendarHeader = function(){
			var jqyHeaderObj = $("<div/>");
			jqyHeaderObj.css("width",this.getWidth()+"px");
			var calHeaderObj = new CalendarHeader(jqyHeaderObj);			
			return calHeaderObj;
		};
		
		/**
		 * Builds a CalendarWeek object. This object stores all the CalendarDayCell objects for the week.
		 *
		 * @return a CalendarWeek object.
		 */
		this.buildCalendarWeek = function(){
			var weekCell = $("<div/>");
			weekCell.css("width",this.getWidth()+"px");
			var calWeek = new CalendarWeek(weekCell);			
			return calWeek;
		};

		/**
		 * Builds a CalendarWeekHeader object. This object stores all the CalendarWeekHeaderCell objects for the week.
		 *
		 * @return a CalendarWeekHeader object.
		 */
		this.buildCalendarWeekHeader = function(){
			var weekHeaderCell = $("<div/>");
			weekHeaderCell.css("width",this.getWidth()+"px");
			var calWeekHeader = new CalendarWeekHeader(weekHeaderCell);			
			return calWeekHeader;
		};			

		/**
		 * Builds a CalendarHeaderCell object. One cell in the CalendarHeader.
		 *
		 * @return a CalendarHeaderCell object.
		 */
		this.buildCalendarHeaderCell = function(){
			var headCell = $('<div/>');
			headCell.css("padding-left",this.cellPadding+"px");
			headCell.css("padding-right",this.cellPadding+"px");
			headCell.css("border-top",this.cellBorderWidth+"px solid #FFFFFF");
			headCell.css("border-bottom",this.cellBorderWidth+"px solid #FFFFFF");
			headCell.css("border-left",this.cellBorderWidth+"px solid #FFFFFF");
			headCell.css("font","13px verdana, georgia, times, arial, helvetica, sans-serif");
			headCell.css("height",this.headerCellHeight+"px");
			headCell.css("background-color","#A2BAF1");
			headCell.css("color","#FFFFFF");
			headCell.css("font-weight","bold");
			headCell.css("float","left");
			headCell.css("clear","right");			
			var calHeadCell = new CalendarHeaderCell(headCell);
			return calHeadCell;
		};
		
		/**
		 * Builds a CalendarWeekHeaderCell object. One cell in the CalendarWeekHeader.
		 *
		 * @return a CalendarWeekHeaderCell object.
		 */
		this.buildCalendarWeekHeaderCell = function(){
			var weekHeaderCell = $('<div/>');
			weekHeaderCell.css("padding-left",this.cellPadding+"px");
			weekHeaderCell.css("padding-right",this.cellPadding+"px");
			//weekHeaderCell.css("border-top",this.cellBorderWidth+"px solid #FFFFFF");
			//weekHeaderCell.css("border-bottom",this.cellBorderWidth+"px solid #FFFFFF");
			weekHeaderCell.css("border-left",this.cellBorderWidth+"px solid #FFFFFF");
			weekHeaderCell.css("font","13px verdana, georgia, times, arial, helvetica, sans-serif");
			weekHeaderCell.css("height",this.dayCellHeaderCellHeight+"px");
			weekHeaderCell.css("background-color","#dedede");
			weekHeaderCell.css("color","#000000");
			weekHeaderCell.css("text-align","right");
			weekHeaderCell.css("float","left");
			weekHeaderCell.css("clear","right");			
			var calWeekHeadCell = new CalendarWeekHeaderCell(weekHeaderCell);
			return calWeekHeadCell;
		};		 

		/**
		 * Builds a CalendarDayCell object. One cell in the CalendarWeek object.
		 *
		 * @return a CalendarDayCell object.
		 */
		this.buildCalendarDayCell = function(){
			var dayCell = $('<div/>');
			dayCell.css("background-color","#efefef");
			dayCell.css("padding-left",this.cellPadding+"px");
			dayCell.css("padding-right",this.cellPadding+"px");
			//dayCell.css("border-top",this.cellBorderWidth+"px solid #FFFFFF");
			dayCell.css("border-bottom",this.cellBorderWidth+"px solid #FFFFFF");
			dayCell.css("border-left",this.cellBorderWidth+"px solid #FFFFFF");
			dayCell.css("color","#444444");
			dayCell.css("font","13px verdana, georgia, times, arial, helvetica, sans-serif");
			//dayCell.css("height",this.dayCellHeight+"px");
			dayCell.css("float","left");
			dayCell.css("clear","right");	
			var calDay = new CalendarDayCell(dayCell);
			return calDay;
		};
		
		/**
		 * Get the current year, 4-digit.
		 *
		 * @return integer
		 */
		this.getCurrentYear = function(){
			return parseInt(this.displayDate.getFullYear());
		};
		
		/**
		 * Get the current month
		 *
		 * @return integer, 0 = Jan, 11 = Dec
		 */
		this.getCurrentMonth = function(){
			return parseInt(this.displayDate.getMonth());
		};

		/**
		 * Get the current day
		 *
		 * @return integer
		 */
		this.getCurrentDay = function(){
			return parseInt(this.displayDate.getDate());
		};

		/**
		 * Get a new date with the next month
		 *
		 * @return A Date object
		 */
		this.getNextMonth = function(){
			var dt = new Date(0,0,1,0,0,0,0);
			if(this.getCurrentMonth() == 11){
				dt.setFullYear(this.getCurrentYear()+1);
				dt.setMonth(0);
			}else{
				dt.setFullYear(this.getCurrentYear());
				dt.setMonth(this.getCurrentMonth()+1);
			}
			return dt;
		};

		/**
		 * Get a new date with the previous month
		 *
		 * @return A Date object
		 */		
		this.getPreviousMonth = function(){
			var dt = new Date(0,0,1,0,0,0,0);
			if(this.getCurrentMonth() == 0){
				dt.setFullYear(this.getCurrentYear()-1);
				dt.setMonth(11);
			}else{
				dt.setFullYear(this.getCurrentYear());
				dt.setMonth(this.getCurrentMonth()-1);
			}
			return dt;
		};	
		
		/**
		 * Return number of days in current month
		 *
		 * @return integer
		 */
		this.getDaysCurrentMonth = function(){
			return parseInt(DateUtil.getDaysInMonth(this.displayDate));
		};
		
		/**
		 * Return number of days in previous month
		 *
		 * @return integer
		 */		
		this.getDaysPreviousMonth = function(){
			var prevDt = this.getPreviousMonth();
			return parseInt(DateUtil.getDaysInMonth(prevDt));
		};	
		
		/**
		 * Return number of days in next month
		 *
		 * @return integer
		 */			
		this.getDaysNextMonth = function(){
			var nextDt = this.getNextMonth();
			return parseInt(DateUtil.getDaysInMonth(nextDt));
		};
		
		this.setHtml = function(htmlData){
			this.jqyObj.html(htmlData);
		};
		
		this.getHtml = function(){
			return this.jqyObj.html();
		};		
		
		this.setCss = function(attr,value){
			this.jqyObj.css(attr,value);
		};
		
		this.getCss = function(attr){
			return this.jqyObj.css(attr);
		};		
		
		this.setAttr = function(id,value){
			this.jqyObj.attr(id,value);
		};
		
		this.getAttr = function(id){
			return this.jqyObj.attr(id);
		};		
		
		/**
		 * Clear all data in the calendar </div> element, inluding
		 * all week objects, week header objects & the calendar header object.
		 */
		this.clear = function(clearAgenda){
			this.jqyObj.html("");
			this.calHeaderObj = null;
			this.weeks = new Array();
			this.weekHeaders = new Array();
			this.dayHash = new Hashtable();
			if(clearAgenda){
				this.agendaItems = new Hashtable();
			}
		};
		
		// get height
		this.getHeight = function(){
			return this.jqyObj.height();
		}		
		
		// get width of calendar
		this.getWidth = function(){
			return this.jqyObj.width();
		};
		
		// get inner width of calendar
		this.getInnerWidth = function(){
			return this.jqyObj.innerWidth();
		};
		
		// add a CalendarHeader object
		this.addHeader = function(calHeader){
			// remove existing header if there is one
			if(this.calHeaderObj != null){
				// already have header
				var headerDiv = this.jqyObj.children("div").first();
				headerDiv.remove();
				this.calHeaderObj = calHeader;
				this.jqyObj.prepend(calHeader.jqyObj);	
			}else{
				this.calHeaderObj = calHeader;
				this.jqyObj.prepend(calHeader.jqyObj);				
			}
		};
		
		// append a CalendarWeek object
		this.addWeek = function(calWeek){
			// push is not supported by IE 5/Win with the JScript 5.0 engine
			this.weeks.push(calWeek);		
			this.jqyObj.append(calWeek.jqyObj);
		};
		
		// append a CalendarWeekHeader object
		this.addWeekHeader = function(calWeekHeader){
			// push is not supported by IE 5/Win with the JScript 5.0 engine
			this.weekHeaders.push(calWeekHeader);		
			this.jqyObj.append(calWeekHeader.jqyObj);
		};
		
		// returns an array of CalendarWeek objects
		this.getWeeks = function(){
			return this.weeks;
		};

		// returns an array of CalendarWeekHeader objects
		this.getWeekHeaders = function(){
			return this.weekHeaders;
		};		
		
		// return the number of weeks for the current month
		this.getNumberWeeks = function(){
			return this.weeks.length;
		};
		
		/**
		 * Add a CalendarAgendaItem to the calendar.
		 *
		 * @param item - (CalendarAgendaItem) - A new CalendarAgendaItem object.
		 */
		this.addAgendaItem = function(item){
			// add agenda item to hash with unique id
			this.agendaItems.put(this.agendaId,item);
			// increment id value for next agenda item.
			this.agendaId++;
			// render the item
			this.renderSingleAgendaItem(item);
		};
		
		/**
		 * Retrieve all agenda items.
		 *
		 * @return (Hashtable jshashtable) of CalendarAgendaItem objects.
		 */
		this.getAgendaItems = function(){
			return this.agendaItems;
		};
		
		/**
		 * Get an agenda item by ID.
		 *
		 * @param id - integer - the unique agenda ID.
		 * @return A CalendarAgendaItem object.
		 */
		this.getAgendaItemById = function(id){
			return this.agendaItems.get(id);
		};
		
		/**
		 * Retrieve the number of agenda items in the calendar.
		 *
		 * @return integer
		 */
		this.getAgendaItemsCount = function(){
			return this.agendaItems.size();
		};		
		
		// append a JQuery object
		this.appendJqyObj = function(obj){
			this.jqyObj.append(obj);
		};
		
		this.shoutOut = function(){
			alert("You have a calendar object!");
		};
		
		/**
		 * call this function when the browser is resized. Resizes all <div/> elements. Clears all agenda item
		 * renders and the re-renders them.
		 *
		 */
		this.resize = function(){
			
			var calWidth = this.getWidth(); // excludes padding
			var cellWidth = Math.floor(calWidth / Calendar.dayNames.length) - this.cellBorderWidth - (this.cellPadding * 2);
			var cellWidthLast = cellWidth + ( calWidth - (cellWidth * Calendar.dayNames.length)) - this.cellBorderTotal - this.cellPaddingTotal;
			
			// make the day cells square
			var cellHeight = cellWidth - this.dayCellHeaderCellHeight;
			
			// width of all elements inside the header <div/>
			var totalHeaderWidth = (cellWidth * 6) + cellWidthLast + this.cellBorderTotal + this.cellPaddingTotal;
			
			// set the width of the header <div/> that wraps all the header cells.
			this.calHeaderObj.setWidth(totalHeaderWidth);
			//this.calHeaderObj.jqyObj.css("width",totalHeaderWidth+"px");
			
			// loop over all cells in header and update their size
			var headerCellsArray = this.calHeaderObj.getHeaderCells();
			if(headerCellsArray != null && headerCellsArray.length > 0){
				for(var headIndex = 0; headIndex < headerCellsArray.length; headIndex++){
					//alert("Resizing header cell " + headIndex);
					if(headIndex == (headerCellsArray.length - 1)){
						// last cell in the header
						headerCellsArray[headIndex].setCss("width",cellWidthLast+"px");
					}else{
						headerCellsArray[headIndex].setCss("width",cellWidth+"px");
					}
				}
			}				
			
			// loop through all weeks & week headers. Update width of day cells and week header cells
			// each week has a week header (the arrays should be the same size if the initialization worked correctly)
			var weekCount = 0;
			var weekCellsArray = this.getWeeks(); // all the week <div>'s in the calendar
			var weekHeadersArray = this.getWeekHeaders(); // all the week header <div>'s in the calendar
			if(weekCellsArray != null && weekCellsArray.length > 0){
				weekCount = weekCellsArray.length;
				for(var weekIndex = 0; weekIndex < weekCellsArray.length; weekIndex++){
					// set the width of the week <div/> that wraps all the day cells.
					weekCellsArray[weekIndex].setWidth(totalHeaderWidth);
					// set the width of the week header <div/> that wraps all the day cells.
					weekHeadersArray[weekIndex].setWidth(totalHeaderWidth);
					var dayCellsArray = weekCellsArray[weekIndex].getDays(); // all the day cells for the current week cell
					var weekHeaderCellsArray = weekHeadersArray[weekIndex].getHeaderCells(); // all the week header cells for the current week header
					if(dayCellsArray != null && dayCellsArray.length > 0){
						// loop through all days of the week
						for(var dayIndex = 0; dayIndex < dayCellsArray.length; dayIndex++){
							if(dayIndex == (dayCellsArray.length - 1)){
								
								// last day cell in the week (Saturday)
								
								// set widths
								dayCellsArray[dayIndex].setCss("width",cellWidthLast+"px");
								weekHeaderCellsArray[dayIndex].setCss("width",cellWidthLast+"px");
								
								// set height (make it the same as width so we have a nice aspect ratio)
								dayCellsArray[dayIndex].setCss("height",cellHeight+"px");
								
								// clear agenda item html for this cell, we will re-render in
								dayCellsArray[dayIndex].clearAgendaPositions();
								
							}else{
							
								// Sunday to friday day cells
							
								// set widths
								dayCellsArray[dayIndex].setCss("width",cellWidth+"px");
								weekHeaderCellsArray[dayIndex].setCss("width",cellWidth+"px");
								
								// set height (make it the same as width so we have a nice aspect ratio)
								dayCellsArray[dayIndex].setCss("height",cellHeight+"px");								
								
								// clear agenda item html for this cell, we will re-render in
								dayCellsArray[dayIndex].clearAgendaPositions();
								
							}
						}
					}
				}
			}
			
			// height of all calendar elements
			var totalCalendarHeight = 
				(weekCount * cellHeight) +  	   			// height of week rows
				(weekCount * this.dayCellHeaderCellHeight) +  	   	// height of week header rows
				(weekCount * (this.cellBorderWidth)) +  			// plus bottom borders (no top) of day cells.
				this.headerCellHeight + (this.cellBorderWidth*2); 	// plus height of header cells and their top & bottom borders.

			// set height of calendar <div/>
			this.setCss("height",totalCalendarHeight+"px");
			
			// re-render all agenda items
			this.renderAgendaItems();			
			
			/*
			$("#calDebug").html(
				"<b>calWidth:</b> " + this.getWidth() + "<br>" +
				"<b>calHeight:</b> " + this.getHeight() + "<br>" +
				"<b>calInnerWidth:</b> " + this.getInnerWidth() + "<br>" +
				"<b>dayCellWidth:</b> " + cellWidth + "<br>" +
				"<b>lastDayCellWidth:</b> " + cellWidthLast + "<br>" +
				"<b>numberWeekRows:</b> " + weekCount + "<br>"
			);
			*/
		
		};
		
		/**
		 * Gets the day index within the week for the day name
		 *
		 * getWeekIndex("Sun") = 0;
		 * getWeekIndex("Mon") = 1;
		 * getWeekIndex("Tue") = 2;
		 * getWeekIndex("Wed") = 3;
		 * getWeekIndex("Thu") = 4;
		 * getWeekIndex("Fri") = 5;
		 * getWeekIndex("Sat") = 6;
		 *
		 * @param dayName - The name of the day, fullname or abbreviated name.
		 @ @return number - Index of day within the week.
		 */
		this.getWeekIndex = function(dayName){
			if(dayName.toUpperCase() == "SUN" || dayName.toUpperCase() == "SUNDAY"){
				return 0;
			}else if(dayName.toUpperCase() == "MON" || dayName.toUpperCase() == "MONDAY"){
				return 1;
			}else if(dayName.toUpperCase() == "TUE" || dayName.toUpperCase() == "TUESDAY"){
				return 2;
			}else if(dayName.toUpperCase() == "WED" || dayName.toUpperCase() == "WEDNESDAY"){
				return 3;
			}else if(dayName.toUpperCase() == "THU" || dayName.toUpperCase() == "THURSDAY"){
				return 4;
			}else if(dayName.toUpperCase() == "FRI" || dayName.toUpperCase() == "FRIDAY"){
				return 5;
			}else if(dayName.toUpperCase() == "SAT" || dayName.toUpperCase() == "SATURDAY"){
				return 6;
			}else{
				return -1
			}			
		};		
	
	};
	// static properties
	Calendar.dayNames = new Array("Sun","Mon","Tue","Wed","Thu","Fri","Sat");
	
	/**
	 * Some utility functions for working with javascript Dates.
	 *
	 */
	function DateUtil() {
	
	};
	/**
	 * Get the number of days in the set year & month
	 *
	 * @return integer 0-31
	 */
	DateUtil.getDaysInMonth = function(date){
		var dt = new Date(date.getFullYear(),date.getMonth(),1,0,0,0,0);
		var month = dt.getMonth();
		var lastMonth = month;
		var dayCount = 0;
		while(lastMonth == month){
			dayCount++;
			dt.setDate(dt.getDate()+1);
			month = dt.getMonth();
		}
		return dayCount;
	};
	/**
	 * Given two dates this function returns the number of days differnt.
	 *
	 * date1 == date2 return 0;
	 * date1 < date2 return positive integer (number of days)
	 * date2 < date1 return positive inetger (number of days)
	 *
	 * @return integer - The days different
	 */
	DateUtil.daysDifference = function(date1,date2) {
		// The number of milliseconds in one day
		var ONE_DAY = 1000 * 60 * 60 * 24;
		// Convert both dates to milliseconds
		var date1_ms = date1.getTime();
		var date2_ms = date2.getTime();
		// Calculate the difference in milliseconds
		var difference_ms = Math.abs(date2_ms - date1_ms);
		// Convert back to days and return
		return Math.round(difference_ms/ONE_DAY);
	};
	/**
	 * Similar to this.daysDifference() only this function can return negative
	 * values so you can tell if date2 is before or after date1, and by how many
	 * days.
	 *
	 * date1 == date2 return 0;
	 * date1 < date2 return positive integer (number of days)
	 * date2 < date1 return negative inetger (number of days)
	 *
	 * @return integer - The days different
	 */
	DateUtil.daysDifferenceDirection = function(date1,date2) {
		// The number of milliseconds in one day
		var ONE_DAY = 1000 * 60 * 60 * 24;
		// Convert both dates to milliseconds
		var date1_ms = date1.getTime();
		var date2_ms = date2.getTime();
		// Calculate the difference in milliseconds
		var difference_ms = date2_ms - date1_ms;
		// Convert back to days and return
		return Math.round(difference_ms/ONE_DAY);
	};
	/**
	 * Get hours difference between date 1 and 2.
	 *
	 * @return integer - The hours different. Negative if date2 < date1, positive if
	 *					 date1 < date2, or 0 if same hour.
	 */
	DateUtil.hoursDifferenceDirection = function(date1,date2) {
		// The number of milliseconds in one hour
		var ONE_HOUR = 1000 * 60 * 60;
		// Convert both dates to milliseconds
		var date1_ms = date1.getTime();
		var date2_ms = date2.getTime();
		// Calculate the difference in milliseconds
		var difference_ms = date2_ms - date1_ms;
		// Convert back to hours and return
		return Math.round(difference_ms/ONE_HOUR);
	};
	/**
	 * Get minutes difference between date 1 and 2.
	 *
	 * @return integer - The minutes different. Negative if date2 < date1, positive if
	 *					 date1 < date2, or 0 if same minute.
	 */
	DateUtil.minutesDifferenceDirection = function(date1,date2) {
		// The number of milliseconds in one minute
		var ONE_MIN = 1000 * 60;
		// Convert both dates to milliseconds
		var date1_ms = date1.getTime();
		var date2_ms = date2.getTime();
		// Calculate the difference in milliseconds
		var difference_ms = date2_ms - date1_ms;
		// Convert back to minutes and return
		return Math.round(difference_ms/ONE_MIN);
	};
	/**
	 * Get seconds difference between date 1 and 2.
	 *
	 * @return integer - The difference in seconds. Negative if date2 < date1, positive if
	 *					 date1 < date2, or 0 if same second.
	 */
	DateUtil.secondsDifferenceDirection = function(date1,date2) {
		// The number of milliseconds in one second
		var ONE_SEC = 1000;
		// Convert both dates to milliseconds
		var date1_ms = date1.getTime();
		var date2_ms = date2.getTime();
		// Calculate the difference in milliseconds
		var difference_ms = date2_ms - date1_ms;
		// Convert back to seconds and return
		return Math.round(difference_ms/ONE_SEC);
	};	
	/**
	 * Given a Date object with the year, month, and day set, this function will
	 * return a Date object set to the next day. Note, this may be in a different 
	 * month and year!
	 *
	 * @param date - (Date) - A date object with the year, month, and day set.
	 * @return Date - A Date object set to the next day. Note, this may be in a different 
	 * month and year!
	 */
	DateUtil.getNextDay = function(date){
	
		// week index for the set day (from 0-6)
		var dayIndex = date.getDay();
		// day of the month (from 1-31)
		var dayNum = date.getDate();
		// month index for the set month (from 0-11)
		var monthNum = date.getMonth();
		// the 4-digit year
		var yearNum = date.getFullYear();
		// number of days in month
		var daysInMonth = DateUtil.getDaysInMonth(date);
		
		if(dayNum == daysInMonth){
			// next month
			if(yearNum == 11){
				// next year
				return new Date(yearNum+1,monthNum+1,1,0,0,0,0);
			}else{
				// same year
				return new Date(yearNum,monthNum+1,1,0,0,0,0);
			}
		}else{
			// same month & year
			return new Date(yearNum,monthNum,dayNum+1,0,0,0,0);
		}

	};		
	/**
	 * Given a Date object with the year, month, and day set, this function will
	 * return a Date object set to the last day in the same week (last day being Saturday)
	 * Note, this may be in a different month and year!
	 *
	 * @param date - (Date) - A date object with the year, month, and day set.
	 * @return Date - A Date object set to the last day in the same week. May be in different month or year!
	 */
	DateUtil.getLastDayInSameWeek = function(date){
		
		// week index for the set day (from 0-6)
		var dayIndex = date.getDay();
		// day of the month (from 1-31)
		var dayNum = date.getDate();
		// month index for the set month (from 0-11)
		var monthNum = date.getMonth();
		// the 4-digit year
		var yearNum = date.getFullYear();
		// number of days in month
		var daysInMonth = DateUtil.getDaysInMonth(date);
		
		if(dayIndex == 6){
			// this is the last day of the week!
			return new Date(yearNum,monthNum,dayNum,0,0,0,0);
		}
		var daysTillEndWeek = 6 - dayIndex;
		
		if((dayNum + daysTillEndWeek) > daysInMonth){
			// next month
			var nextSunday = daysTillEndWeek - (daysInMonth - dayNum);
			if(yearNum == 11){
				// next year
				return new Date(yearNum+1,monthNum+1,nextSunday,0,0,0,0);
			}else{
				// same year
				return new Date(yearNum,monthNum+1,nextSunday,0,0,0,0);
			}
		}else{
			// same month & year
			return new Date(yearNum,monthNum,dayNum+daysTillEndWeek,0,0,0,0);
		}
		
	};
	/**
	 * Given a Date object with the year, month, and day set, this function will
	 * return a Date object set to the first day of the next week (Sunday.) This may
	 * be in the next month or even the next year.
	 *
	 * @param date - (Date) - A date object with the year, month, and day set.
	 * @return Date - A Date object set to the first dat of the next week. May be in next month or year.
	 */		
	DateUtil.getFirstDayNextWeek = function(date){

		// week index for the set day (from 0-6)
		var dayIndex = date.getDay();
		// day of the month (from 1-31)
		var dayNum = date.getDate();
		// month index for the set month (from 0-11)
		var monthNum = date.getMonth();
		// the 4-digit year
		var yearNum = date.getFullYear();
		// number of days in month
		var daysInMonth = DateUtil.getDaysInMonth(date);	
		
		if(dayIndex == 0){
			// this is the first day of the week! (Sunday)
			return new Date(yearNum,monthNum,dayNum,0,0,0,0);
		}
		var daysTillEndWeek = 6 - dayIndex;
		var nextMonday = dayNum + daysTillEndWeek + 1;
		if(nextMonday > daysInMonth){
			// next month
			var newDay = daysTillEndWeek - (daysInMonth - dayNum) + 1;
			if(yearNum == 11){
				// next year
				return new Date(yearNum+1,monthNum+1,newDay,0,0,0,0);
			}else{
				// same year
				return new Date(yearNum,monthNum+1,newDay,0,0,0,0);
			}
		}else{
			// same month & year
			return new Date(yearNum,monthNum,nextMonday,0,0,0,0);
		}
	};
	/**
	 * Some utility functions for working with colors
	 *
	 */
	function ColorUtil() {
	
	};
	ColorUtil.getLighterColor = function(rgbColor,ratio){
		return ColorUtil.changeColor(rgbColor, ratio, false);
	};	
	ColorUtil.getDarkerColor = function(rgbColor,ratio){
		return ColorUtil.changeColor(rgbColor, ratio, true);
	};	
	ColorUtil.changeColor = function(color, ratio, darker){
		
		// Trim trailing/leading whitespace
		color = color.replace(/^\s*|\s*$/, '');
		
		// Expand three-digit hex
		color = color.replace(
			/^#?([a-f0-9])([a-f0-9])([a-f0-9])$/i,
			'#$1$1$2$2$3$3'
		);

		// Calculate ratio
		var difference = Math.round(ratio * 256) * (darker ? -1 : 1),
			// Determine if input is RGB(A)
			rgb = color.match(new RegExp('^rgba?\\(\\s*' +
				'(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
				'\\s*,\\s*' +
				'(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
				'\\s*,\\s*' +
				'(\\d|[1-9]\\d|1\\d{2}|2[0-4][0-9]|25[0-5])' +
				'(?:\\s*,\\s*' +
				'(0|1|0?\\.\\d+))?' +
				'\\s*\\)$'
			, 'i')),
			alpha = !!rgb && rgb[4] != null ? rgb[4] : null,

			// Convert hex to decimal
			decimal = !!rgb? [rgb[1], rgb[2], rgb[3]] : color.replace(
				/^#?([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])([a-f0-9][a-f0-9])/i,
				function() {
					return parseInt(arguments[1], 16) + ',' +
						parseInt(arguments[2], 16) + ',' +
						parseInt(arguments[3], 16);
				}
			).split(/,/),
			returnValue;

		// Return RGB(A)
		return !!rgb ?
			'rgb' + (alpha !== null ? 'a' : '') + '(' +
				Math[darker ? 'max' : 'min'](
					parseInt(decimal[0], 10) + difference, darker ? 0 : 255
				) + ', ' +
				Math[darker ? 'max' : 'min'](
					parseInt(decimal[1], 10) + difference, darker ? 0 : 255
				) + ', ' +
				Math[darker ? 'max' : 'min'](
					parseInt(decimal[2], 10) + difference, darker ? 0 : 255
				) +
				(alpha !== null ? ', ' + alpha : '') +
				')' :
			// Return hex
			[
				'#',
				ColorUtil.pad(Math[darker ? 'max' : 'min'](
					parseInt(decimal[0], 10) + difference, darker ? 0 : 255
				).toString(16), 2),
				ColorUtil.pad(Math[darker ? 'max' : 'min'](
					parseInt(decimal[1], 10) + difference, darker ? 0 : 255
				).toString(16), 2),
				ColorUtil.pad(Math[darker ? 'max' : 'min'](
					parseInt(decimal[2], 10) + difference, darker ? 0 : 255
				).toString(16), 2)
			].join('');	

	};
	ColorUtil.HexToR = function(h){
		return parseInt((ColorUtil.cutHex(h)).substring(0,2),16);
	};
	ColorUtil.HexToG = function(h){
		return parseInt((ColorUtil.cutHex(h)).substring(2,4),16);
	};
	ColorUtil.HexToB = function(h){
		return parseInt((ColorUtil.cutHex(h)).substring(4,6),16);
	};
	ColorUtil.cutHex = function(h){
		return (h.charAt(0)=="#") ? h.substring(1,7) : h;
	};
	ColorUtil.padColorValue = function(num,totalChars){
		var pad = '0';
		num = num + '';
		while (num.length < totalChars) {
			num = pad + num;
		}
		return num;	
	};	
	
	/**
	 * Extend JQuery and and add our function.
	 */
	$.fn.jFrontierCal = function(attr,options) {
	
		var elmId = $(this).attr('id');
	
		// default options.
		var opts;
		var defaults = {
			foo: 'bar',
			date: new Date(),
			dayClickCallback: function(eventObj){
				alert("Day cell clicked! Override this handler to process click events on day cells.");
			},
			agendaClickCallback: function(eventObj){
				alert("Agenda item clicked! Override this handler to process click events on agenda items.");
				// prevent event from bubbling down to day cells below
				eventObj.stopPropagation();
			}
		};	
	
		// Check to see if an object is a plain object (created using "{}" or "new Object").
		if($.isPlainObject(attr)){
			
			/*
			This block will be executed when we call our plugin with options:
			$("#elmId").jFrontierCal({
					foo: '1',
			     bar: '2'
			});
			*/
			
			// extend default options with any that were provided by user
			var options = attr;
			opts = $.extend(defaults, options);
			allOptions[elmId] = opts;
			
		}else{
			
			/*
			This block will be executed when we call our plugin like so:
			$("#elmId").jVertTabsDev();
			Or..
			$("#elmId").jVertTabsDev('active',true);
			*/
			
			opts = $.extend(defaults, options);
			allOptions[elmId] = opts;

		}	
		
		// instantiate instance of plugin and initialize it for all matching elements.
        return this.each(function() {
		
			var calElm = $(this);
			
			// Return early if this element already has a plugin instance
			if (calElm.data('plugin')){
				return;
			}
			
			// options for this calendar
			var thisCalOpts = allOptions[elmId];
			
			// create plugin
			var myplugin = new jFrontierCalPlugin(
				calElm,
				thisCalOpts.dayClickCallback,
				thisCalOpts.agendaClickCallback);
			
			// initialize calendar
			myplugin.init();
			
			// Store plugin object in this element's data so the user can access it in their code
			calElm.data('plugin', myplugin);
			
        });		

	};	
	
	/**
	 * The interface to our calendar.
	 *
	 * @param calElm - jQuery object reference for the calendar <div/>
	 * @param dayClickCallback - A callback function for clicks on the day cells.
	 * @param agendaClickCallback - A callback function for clicks on agenda items.
	 */
	var jFrontierCalPlugin = function(calElm,dayClickCallback,agendaClickCallback){
	
		var obj = this;

		// id of calendar <div/> element
		var calId = calElm.attr('id');
		
		// the callback function that's triggered when users click a day cell
		var clickEvent_dayCell = dayClickCallback;
		// the callback function that's triggered when users click an agenda cell
		var clickEvent_agendaCell = agendaClickCallback;		
		
		/**
		 * Initialized the plugin. Builds the calendar.
		 *
		 */
		this.init = function(){
		
			// current date and time
			var dtNow = new Date();
			
			var calObj = new Calendar();
			calObj.initialize(
				calElm,					// jquery object that references the calendar <div/> element.
				dtNow,					// initialize the calendar with the current month & year
				clickEvent_dayCell,		// callback function that's triggered when users click a day cell
				clickEvent_agendaCell	// callback function that's triggered when users click an agenda cell 
			);
			
			// store our calendar in a global hash so we can get at it later
			// var calId = calObj.getAttr("id");
			myCalendars.put(calId,calObj);
			
			// when the window is resized we want to resize all calendars we are keeping track of.
			$(window).resize(this.doResizeAll);
			
			// resize all elements in the calendar relative to the parent clendar </div> element
			this.doResizeAll();
			this.doResizeAll();
			
			return calObj;
		};

		/**
		 * Add agenda item to Calendar display.
		 *
		 * @param calId     - (String) - The ID of the calendar </div> element.
		 * @param title     - (String) - The title of the agenda item.
		 * @param startDate - (Date)   - Date the agenda event starts.
		 * @param endDate   - (Date)   - Date the agenda event ends.
		 * @param data      - (Object) - Any data you want to store in the agenda item. An object with a series of key value pairs.
		 *								 e.g. {var1: "some data", var2: "more data", var3: "etc..."}
		 */
		this.addAgendaItem = function(calId,title,startDate,endDate,data){
			if(calId != null && title != null && startDate != null && endDate != null){
				// make sure start date comes before end date
				if(DateUtil.secondsDifferenceDirection(startDate,endDate) < 0){
					alert("Sorry, you can't create an event that ends before it starts");
					return;
				}
				calId = stripNumberSign(calId);
				var hashData = new Hashtable();
				if(data != null){
					for(var key in data){
						hashData.put(key,data[key]);
					}
				}
				var agi = new CalendarAgendaItem(title,startDate,endDate,hashData);
				var calObj = myCalendars.get(calId);
				calObj.addAgendaItem(agi);
				//alert("New Agenda Item:\n" + agi.toString());			
			}
		};
		
		/**
		 * Get the number of agenda items stored in the calendar.
		 *
		 * @return integer.
		 */
		this.getAgendaItemsCount = function(){
			if(calId != null){
				calId = stripNumberSign(calId);
				var calObj = myCalendars.get(calId);
				return calObj.getAgendaItemsCount();
			}		
		};
		
		/**
		 * Switch to the previous month
		 *
		 * @param calId - (String) - The ID of the calendar </div> element.
		 */
		this.showPreviousMonth = function(calId){
			if(calId != null){
				calId = stripNumberSign(calId);
				var calObj = myCalendars.get(calId);
				calObj.previousMonth();
			}
		};
		
		/**
		 * Switch to the next month
		 *
		 * @param calId - (String) - The ID of the calendar </div> element.
		 */
		this.showNextMonth = function(calId){
			if(calId != null){
				calId = stripNumberSign(calId);
				var calObj = myCalendars.get(calId);
				calObj.nextMonth();
			}
		};		
		
		/**
		 * Set the calendar to the specified year & month.
		 *
		 * @param calId - (String) - The ID of the calendar </div> element.
		 * @param year  - (String) - 4-digit year (e.g, "2010" or "1979")
		 * @param month - (String) - Month (e.g. "0" = Janurary, "1" or "01" = February, "11" = December)
		 */
		this.showMonth = function(calId,year,month){
			if(calId != null && year != null && month != null && year.length == 4 && (month.length == 1 || month.length == 2)){
				
				calId = stripNumberSign(calId);
				
				// strip any preceeding 0's
				month = month.replace(/^[0]+/g,"");
				
				var yearInt = parseInt(year);
				var monthInt = parseInt(month);
				
				var dateToShow = new Date(yearInt,monthInt,1,0,0,0,0);
				
				var calObj = myCalendars.get(calId);
				calObj.setDisplayDate(dateToShow);
			}
		};
		
		/**
		 * Retrieves the date that the calendar is currently set to.
		 *
		 * @param calId - (String) - The ID of the calendar </div> element.
		 * @return A Date object. The date the calendar is currently set to.
		 */
		this.getCurrentDate = function(calId){
			if(calId != null){
				calId = stripNumberSign(calId);
				var calObj = myCalendars.get(calId);
				return calObj.getDisplayDate();
			}
		};
		
		/**
		 * Resizes all calendars that the plugin is managing.
		 *
		 */		
		this.doResizeAll = function(){
			if(myCalendars != null && myCalendars.size() > 0){
				var cals = myCalendars.values();
				for(var i=0; i<cals.length; i++){
					cals[i].resize();
				}
			}
		};

		/**
		 * Resizes a specific calendar.
		 *
		 * @param calId - (String) - The ID of the calendar </div> element.
		 */		
		this.doResize = function(calId){
			if(myCalendars != null && myCalendars.size() > 0 && calId != null){
				calId = stripNumberSign(calId);
				var calObj = myCalendars.get(calId);
				calObj.resize();
			}
		};		
		
		/**
		 *
		 * Following methods are not exposed via the plugin. These are private.
		 *
		 */
		
		/**
		 * Strips the "#" from the begining of string s (if there is one)
		 *
		 * @param s - (String) - A string with a single preceeding # character.
		 * @return A String. The string s without the preceeding # character, or simply s if there is no # character.
		 */
		function stripNumberSign(s){
			if(s != null){
				if(s.startsWith("#")){
					return s.substring(1,s.length);
				}
			}
			return s;
		};
		
		/**
		 * Test function for handling click events on day cells.
		 */
		 /*
		function handleDayClickEvent(eventObj){
			
			//var dayCell = $(eventObj.target);
			var dayObject = eventObj.data.calDayObj;
			
			//alert(dayObject.getHtml());
			
			var id = dayObject.getAttr("id");
			
			var x = dayObject.getX();
			var y = dayObject.getY();
			var w = dayObject.getWidth();
			var h = dayObject.getHeight();
			
			alert("Id: " + id + ", X: " + x + ", Y: " + y + ", W: " + w + ", H: " + h);
			
			var calItem = $('<div/>');
			calItem.css("position","absolute");
			calItem.css("left",x+"px");
			calItem.css("top",y+"px");
			calItem.css("height","15px");
			calItem.css("width","250px");
			calItem.css("background-color","red");
			calItem.css("color","white");
			calItem.css("padding","2px");
			calItem.css("font","12px verdana, georgia, times, arial, helvetica, sans-serif");
			calItem.html("This is a test");
			
			dayObject.jqyObj.append(calItem);

		};
		*/

	};
		
})(jQuery);