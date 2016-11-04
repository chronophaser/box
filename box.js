window.onload = function(){
// TODO ITEMS:::
// DONE Q0:Chrono: neat. you should provide an option to auto uncheck things that have been selected

// DONE don't re-select same thing in a row
// - finish tag selector logic 

// DONE render and show those categories
// - box categories

// DONE checkbox controls (select/unselect all)



// Get JSON      -----   TODO: make this all better, and asynchronous
var request = new XMLHttpRequest();
request.open('GET', 'box.json', false);
request.send(null);
// TODO: handle this better
var json_data = JSON.parse(request.responseText);
var data = json_data.content;
var boxdata = json_data.boxes;

var selections_div = document.getElementById('d_selections');
var alltags = {};

// our option object
function boxItem (defObj,i_tags,parentDiv,level){
  var callback = this;
  var tagSelection = false;
  var hidden = false;
  
  // duration stuffs
  callback.duration = 0;
  if (defObj.duration){callback.duration = timeToSeconds(defObj.duration)}
  
  var tags = {};
  for (var tag in defObj.tags){tags[defObj.tags[tag]] = true}
  for (var tag in i_tags){tags[i_tags[tag]] = true}
  for (var tag in tags){alltags[tag] = (alltags[tag] || 0)+1}
  callback.tags = tags;

  var dom = buildSelDom(
    defObj.id,
    defObj.num,
    defObj.title,
    Object.keys(tags).join(),
    callback.duration
  );
  if (!parentDiv){parentDiv = selections_div}
  dom.div.classList.add("level"+level);
  parentDiv.appendChild(dom.div);

  callback.check = function(check){
    dom.checkbox.checked = check;
  };
  callback.tagSelect = function (q_tags){
    var matched = true;
    for (var tag in q_tags){if (!tags[q_tags[tag]]){matched = false}}
    if (matched){tagSelection = true}
  };
  callback.tagUnselect = function (q_tags){
    var matched = true;
    for (var tag in q_tags){if (!tags[q_tags[tag]]){matched = false}}
    if (matched){tagSelection = false}
  };
  callback.pushSelection = function (){
    if (tagSelection){ dom.div.classList.remove("hidden"); hidden=false;}
    else {dom.div.classList.add("hidden"); hidden=true;}
    callback.unwin();
    tagSelection = false;
    return !hidden;
  };
  callback.unwin = function (){
    dom.div.classList.remove("winner");
  };
  callback.getOption = function(){
    callback.unwin();
    var returnThing =[];
    if (!hidden && dom.checkbox.checked){
      returnThing[0] = {id:defObj.id,win:callback.win};
    }
    return returnThing;
  };
  callback.win = function(uncheck){
    dom.div.classList.add("winner");
    if (uncheck){dom.checkbox.checked = false}
    return {num:defObj.num,title:defObj.title};
  };
  callback.setGroup = function (){}; //multi-item placeholders
  callback.setInclGroups = function (){return !hidden};
  return callback;
}

//
// multiparter object
//
function boxMultiItem (defObj,i_tags,parentDiv,level){
  var callback = this;
  var tagSelection = false;
  var included = false;
  var grouped = false;
  var hidden = false;  //only grouped selection
  
  // Structure:
  //  parentDiv
  //    containerdiv
  //      singlesdiv
  //        <selections>
  //      multidiv
  //        <group selection>
  
  callback.duration = 0;
  
  var tags = {};
  for (var tag in defObj.tags){tags[defObj.tags[tag]] = true}
  for (var tag in i_tags){tags[i_tags[tag]] = true}
  
  var singles = new Array;
  var nums = [];
  var containerdiv = document.createElement("div");
  containerdiv.classList.add("level"+level);
  var singlesdiv = document.createElement("div");
  for (var ep in defObj.parts) {
    var s = new boxItem(defObj.parts[ep],i_tags,singlesdiv);
    for (var tag in s.tags){tags[tag] = true}

    nums.push(defObj.parts[ep].num);
    singles.push(s);
    callback.duration += s.duration;
  }
  containerdiv.appendChild(singlesdiv);
  
  var dom = buildSelDom(
    defObj.combined.id,
    nums,
    defObj.combined.title,
    Object.keys(tags).join(),
    callback.duration
  );
  var multidiv = document.createElement("div");
  multidiv.appendChild(dom.div);
  containerdiv.appendChild(multidiv);
  parentDiv.appendChild(containerdiv);
  
  callback.setGroup = function (i_grouped) {
    if (i_grouped){
      singlesdiv.classList.add("hidden");
      multidiv.classList.remove("hidden");
      grouped = true;
    } else {
      singlesdiv.classList.remove("hidden");
      multidiv.classList.add("hidden");
      grouped = false;
    }
  };
  function updateIncluded() {
    if (included){containerdiv.classList.remove('hidden')}
    else {containerdiv.classList.add('hidden')}
  }
  callback.setInclGroups = function (set_include) {
    if (set_include){ included = true }
    else { included = false }
    updateIncluded();
    if ( !included ){ return false; }
    var shown = (included && !hidden);
    for (var s in singles){shown = singles[s].setInclGroups() || shown}
    return shown;
  };
  callback.check = function(check){
    dom.checkbox.checked = check;
    for (var s in singles){singles[s].check(check)}
  };
  callback.tagSelect = function(q_tags){
    var matched = true;
    for (var tag in q_tags){if (!tags[q_tags[tag]]){matched = false}}
    if (matched){tagSelection = true}
    for (var s in singles){singles[s].tagSelect(q_tags)}
  };
  callback.tagUnselect = function(q_tags){
    var matched = true;
    for (var tag in q_tags){if (!tags[q_tags[tag]]){matched = false}}
    if (matched){tagSelection = false}
    for (var s in singles){singles[s].tagUnselect(q_tags)}
  };
  callback.pushSelection = function(){
    if (tagSelection){ dom.div.classList.remove("hidden"); hidden = false}
    else {dom.div.classList.add("hidden"); hidden = true}
    tagSelection = false;
    var shown = false;
    for (var s in singles){shown = singles[s].pushSelection() || shown}
    updateIncluded();
    callback.unwin();
    return (included && (!hidden || shown));
  };
  callback.unwin = function(){
    dom.div.classList.remove("winner");
    for (var s in singles){singles[s].unwin()}
  };
  callback.getOption = function(){
    callback.unwin();
    var returnThing = [];
    if (included && !hidden && grouped && dom.checkbox.checked){
      returnThing[0] = {id:defObj.combined.id,win:callback.win};
    } else if (included && !hidden && !grouped){
      for (var s in singles){
        var sThing = singles[s].getOption();
        if (sThing[0]){returnThing.push(sThing[0])};
      }
    }
    return returnThing;
  };
  callback.win = function(uncheck){
    dom.div.classList.add("winner");
    if (uncheck){dom.checkbox.checked = false}
    return {num:nums.join([separator='<br/>']),title:defObj.combined.title};
  }
  return callback;
}

//
// category object
//
function categoryItem(defObj,i_tags,parentDiv,level){
  var callback = this;
  var hidden = false;
  
  var tags = i_tags.concat(defObj.tags);
  
  var children = new Array;
  
  var titlediv = document.createElement("div");
  titlediv.classList.add("sel-inner");
  titlediv.classList.add("category");
  titlediv.appendChild(document.createTextNode(defObj.title));
  var div = document.createElement("div");
  div.classList.add("sel");
  var childrenDiv = document.createElement("div");
  div.appendChild(titlediv);
  var outerDiv = document.createElement("div");
  outerDiv.appendChild(div);
  outerDiv.appendChild(childrenDiv);
  outerDiv.classList.add("level"+level);
  parentDiv.appendChild(outerDiv);
  
  for (var item in defObj.content) {
    if (defObj.content[item].type == "category") {
      children.push(new categoryItem(defObj.content[item],tags,selections_div,level+1));
    } else if (defObj.content[item].type == "multipart") {
      children.push(new boxMultiItem(defObj.content[item],tags,selections_div,level+1));
    } else {
      children.push(new boxItem(defObj.content[item],tags,selections_div,level+1));
    }
  }
  
  // pushSelection and setInclGroups determine what shows,
  //  so we hide/unhide the category based on the returns
  //  ... and make sure to return our own
  callback.pushSelection = function(){
    var shown = false;
    for (var c in children){shown = children[c].pushSelection() || shown}
    if (shown){div.classList.remove('hidden')}else{div.classList.add('hidden')}
    return shown;
  };
  callback.setInclGroups = function(set_include) {
    var shown = false;
    for (var c in children){shown = children[c].setInclGroups(set_include) || shown}
    if (shown){div.classList.remove('hidden')}else{div.classList.add('hidden')}
    return shown;
  };
  
  // getOption needs to combine returns
  callback.getOption = function(){
    var returnThing = [];
    for (var c in children){
      var cThing = children[c].getOption();
      if (cThing[0]){returnThing = returnThing.concat(cThing)};
    }
    return returnThing;
  };
  
  // the rest of the callbacks just get passed through
  callback.setGroup = function(grouped){
    for (var c in children){children[c].setGroup(grouped)}
  }
  callback.tagSelect = function(q_tags){
    for (var c in children){children[c].tagSelect(q_tags)}
  }
  callback.tagUnselect = function(q_tags){
    for (var c in children){children[c].tagUnselect(q_tags)}
  }
  callback.unwin = function(){
    for (var c in children){children[c].unwin()}
  }
  callback.check = function(check){
    for (var c in children){children[c].check(check)}
  };
  return callback;
}

//
//  common dom elements builder
//
function buildSelDom(id,num,title,hover,duration){
  var checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "c_" + id;
  checkbox.checked = true;
  var checkdiv = document.createElement("div");
  checkdiv.classList.add("sel-inner");
  checkdiv.appendChild(checkbox);
  
  if (!Array.isArray(num)){num = [num]}
  var numdiv = document.createElement("div");
  numdiv.classList.add("sel-inner");
  for (var i = 0; i < num.length; i++){
    if (i > 0){numdiv.appendChild(document.createElement("br"))}
    numdiv.appendChild(document.createTextNode(num[i]));
  }
  
  var titlediv = document.createElement("div");
  titlediv.classList.add("sel-inner");
  titlediv.appendChild(document.createTextNode(title));
  
  var label = document.createElement("label");
  label.htmlFor = checkbox.id;
  label.classList.add("sel-label");
  label.title = hover;
  
  label.appendChild(checkdiv);
  label.appendChild(numdiv);
  label.appendChild(document.createTextNode("\u00A0"));
  label.appendChild(titlediv);
  
  if (duration) {
    var durationDiv = document.createElement("div");
    //durationDiv.classList.add("sel-inner");
    durationDiv.classList.add("duration");
    durationDiv.appendChild(document.createTextNode(secondsToTime(duration)));
    label.appendChild(durationDiv);
  }
  
  var div = document.createElement("div");
  div.id = "s_" + id;
  div.classList.add("sel");
  div.appendChild(label);
  
  return {checkbox:checkbox,label:label,div:div};
}


// parse data
var items = [];
function traverseData(arr,tags){
  for (var obj in arr) {
    obj = arr[obj];
    if (!tags) {tags = []}  // there's gotta be a better way to do this
    if (obj.type == "category") {
      items.push(new categoryItem(obj,[],selections_div,0));
      //traverseData(obj.content,tags.concat(obj.tags));
    } else if (obj.type == "multipart") {
      items.push(new boxMultiItem(obj,tags,selections_div,0));
    } else {
      // no type means single entry
      items.push(new boxItem(obj,tags,selections_div,0));
    }
  }
}
traverseData(data);

function setGrouped(grouped){
  for (var item in items){
    items[item].setGroup(grouped);
  }
}
setGrouped(document.getElementById("multi_group").checked);

function setInclGroups(included){
  for (var item in items){
    items[item].setInclGroups(included);
  }
}
setInclGroups(document.getElementById("include_groups").checked);

function sel_checkall(check){
  for (var item in items){items[item].check(check)}
}

var boxesdiv = document.getElementById('d_boxes');
var autoboxesdiv = document.getElementById('d_autoboxes');
var selectedBox;

//see if we've been given tags to work with
var query = {};
if (location.search){
  parms = location.search.substring(1).split("&");
  for (var i=0;i<parms.length;i++){
    var pair = parms[i].split("=");
    query[pair[0]] = pair[1].split(",").sort().toString();
  }
}

function makeBox (boxd,parentDiv,level){
  var callback = this;
  
  var boxdiv = document.createElement("div");
  boxdiv.appendChild(document.createTextNode(boxd.name));
  boxdiv.classList.add('level'+level);
  parentDiv.appendChild(boxdiv);
  
  if (boxd.tags || boxd.itags) {
    boxdiv.classList.add('box');
    //TODO:  add complex-tag support
    var tags = boxd.tags.split(" ").sort();
    var params = "?tags="+tags.join();
    callback.select = function(){
      if (selectedBox){selectedBox.classList.remove('activebox')}
      for (var item_i in items){
        items[item_i].tagSelect(boxd.tags.split(" "));
        items[item_i].pushSelection();
      }
      selectedBox = boxdiv;
      boxdiv.classList.add('activebox');
      if(location.search != params){history.replaceState("","",params)};
    };
    boxdiv.onclick = callback.select;
    
    if (location.search == params){
      // TODO:  all of this more elegantly
      
      callback.select();
    }
  } else {
    boxdiv.classList.add('boxnocontent');
  }
  
  if (boxd.content) {
    boxdiv.classList.add('boxcategory');
    var cboxes = [];
    for (var cbox in boxd.content) {
      cboxes.push(new makeBox(boxd.content[cbox],parentDiv,level + 1));
    }
  }
  return callback;
}


function timeToSeconds(time) {
  var parts = time.split(":");
  var seconds = +parts[parts.length-1];
  if (parts[parts.length-2]){seconds += parts[parts.length-2] * 60}
  if (parts[parts.length-3]){seconds += parts[parts.length-3] * 60 * 60}
  return seconds;
}
function secondsToTime(seconds){
  var hours = Math.floor(seconds / (60*60));
  var mins = Math.floor((seconds - (hours * 60*60)) / 60);
  var secs = seconds - (hours * 60*60) - (mins * 60);
  var time = "";
  if (hours > 0){time += hours+":"}
  time += (hours>0&&mins<10) ? "0"+mins : mins;
  time += ":" + ((secs<10) ? "0"+secs : secs);
  return time;
}

// copied from http://stackoverflow.com/a/11811767
function getSortedKeys(obj) {
    var keys = []; for(var key in obj) keys.push(key);
    return keys.sort(function(a,b){return obj[b]-obj[a]});
}
var autoboxes = [];
var sortedTags = getSortedKeys(alltags);
for (var tag in sortedTags){
  autoboxes.push(new makeBox({name:sortedTags[tag],tags:sortedTags[tag]},autoboxesdiv));
}

// do the autoboxes first so the proper boxes will end up selected by query
var boxes = [];
for (var box_i in boxdata){
  boxes.push(new makeBox(boxdata[box_i],boxesdiv,0));
}

var curWinner = "";
var windiv = document.getElementById("winner");
var winnum = document.getElementById("winnernum");
var wintitle = document.getElementById("winnertitle");
var errdiv = document.getElementById("winerror");
var uncheck_on_win = document.getElementById('uncheck_on_win');


//
// get options, randomly select
//
function randSelect(){
  var options = [];
  var dupewin = 0;
  for (var item_i in items){
    var optObj = items[item_i].getOption();
    for (var opt in optObj){
      options.push(optObj[opt]);
      // check if the current winner is among the options
      if (optObj[opt].id == curWinner){dupewin = options.length}
    }
  }

  // remove the current winner from the options, unless there's only one
  if (options.length > 1 && dupewin){
    options.splice(dupewin - 1, 1);
  }

  winnum.innerHTML = "";
  wintitle.innerHTML = "";
  errdiv.innerHTML = "";
  
  if (options.length){
    var i_win = Math.floor(Math.random() * options.length);
    var winner = options[i_win].win(uncheck_on_win.checked);
    curWinner = options[i_win].id;
    winnum.innerHTML = winner.num;
    wintitle.innerHTML = "\u00A0" + winner.title;
  } else {
    curWinner = "";
    errdiv.innerHTML = "WE GOT NOTHING";
  }
}

// onclick bindings  TODO: restructure the rest to do this better
var include_groups_button = document.getElementById("include_groups");
document.getElementById("include_groups").onclick = setInclGroups(include_groups_button.checked);
document.getElementById("multi_group").onclick = setGrouped(this.checked);


}
