// should be 24
var drawColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#80FF00', '#8000FF', '#FF0080', '#00FF80', '#0080FF', '#FFFF80', '#FF80FF', '#80FFFF', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#FF8080', '#80FF80', '#8080FF']
var fontColors = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']

var labelsIdx = -1
var loadoutsIdx = 0

function initializeItemList(changeColour, selector) {
  var selElmnt = selector.getElementsByTagName('select')[0]
  var l = selElmnt.length;
  var itemList = document.createElement("DIV");
  itemList.setAttribute("class", "item-list select-hide");
  selector.append(itemList);

  // Append colour options
  for (var i = 0; i < l; i++) {
    /*for each option in the original select element,
    create a new DIV that will act as an option item:*/
    var item = document.createElement("DIV");
    item.setAttribute("class", "selectable");
    item.setAttribute("contenteditable", "true");
    item.setAttribute("placeholder", selElmnt.options[i].value);
    item.setAttribute("value", selElmnt.options[i].value);
    item.innerHTML = selElmnt.options[i].innerHTML;
    itemList.append(item);

    if(selElmnt.parentNode.id === 'labels') {
      item.style.backgroundColor = drawColors[selElmnt.options[i].value]
      item.style.color = fontColors[selElmnt.options[i].value];
      if(selElmnt.options[i].value > labelsIdx) {
        labelsIdx = parseInt(selElmnt.options[i].value)
      }
    } else if(selElmnt.parentNode.id === 'loadouts') {
      if(selElmnt.options[i].value > loadoutsIdx) {
        loadoutsIdx = parseInt(selElmnt.options[i].value)
      }
    }

    item.addEventListener("click", labelClickEvent);
  }

  /* Add "+" button to item list */
  var add = document.createElement("DIV");
  add.setAttribute("class", "selectable add");
  add.setAttribute("list", selElmnt.parentNode.id);

  add.innerHTML = "+";
  //console.log(itemList)
  itemList.append(add);

  // Create a new label 
  add.addEventListener("click", function(e) {
    var list = this.getAttribute('list')
    var lbl = document.createElement("DIV");
    lbl.setAttribute("class", "selectable selected");
    lbl.setAttribute("contenteditable", "true")

    if(list === 'labels') {
      labelsIdx +=1
      lbl.setAttribute("placeholder", labelsIdx+"...")
      lbl.setAttribute("value", labelsIdx);
      lbl.style.backgroundColor = drawColors[labelsIdx]
      lbl.style.color = fontColors[labelsIdx]
      changeColour(drawColors[labelsIdx])
      //console.log("NEW COLOUR: ", drawColors[labelsIdx-1])
      activeCursor = true;
    } else if(list === 'loadouts'){
      loadoutsIdx +=1
      lbl.setAttribute("placeholder", loadoutsIdx)
      lbl.setAttribute("value", loadoutsIdx);
      $("#labels > select").html("")
      $("#labels > .selected").remove()
      $("#labels > .item-list").remove()
      initializeItemList(changeColour, document.getElementById('labels'));
      activeCursor = false;
      labelsIdx = -1
    }

    lbl.addEventListener("click", labelClickEvent);
    // when add is clicked, move selected item into item-list. 
    try {
      var a = $("#"+list)[0].firstChild;
      console.log(a)
      a.classList.toggle("selected")
      $("#"+list+" > .item-list")[0].prepend(a)
    } catch {
      console.log("No selected item...")
    }

    this.parentNode.parentNode.prepend(lbl);
  })

  // initialize the first item in list as selected item
  itemList.firstChild.classList.toggle("selected")
  changeColour(rgbStringToHex(itemList.firstChild.style.backgroundColor))
  itemList.parentNode.prepend(itemList.firstChild)


  /*if the user clicks anywhere outside the select box,
  then close all select boxes:*/
  document.addEventListener("click", closeAllSelect);
}

// when a label is clicked, change to that label
function labelClickEvent(e) {
  if(this.classList.contains("selected")) {
    e.stopPropagation();
    closeAllSelect(this);
    this.parentNode.lastChild.classList.toggle("select-hide");

  } else {
    if(this.parentNode.parentNode.id === "loadouts") {
      // if a new loadout is being selected, delete all label entries from the  previous loadout and reinitialize
      $("#labels > select").html("")
      $("#labels > .selected").remove()
      $("#labels > .item-list").remove()

      window.api.invoke('get_loadouts', this.getAttribute("value"))
      .then((loadout) => {

          for (const [label, label_data] of Object.entries(loadout['labels'])) {
              $("#labels > select").append('<option value='+label+' color = '+label_data['color']+' placeholder='+label+'>'+label_data['name']+'</option>');
          }
          initializeItemList(changeColour, document.getElementById('labels'));
      }).catch(function(err) {
          console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
      });
    }

    // move previouly selected node into item list
    try {
      var a = this.parentNode.parentNode.firstChild;
      a.classList.toggle("selected")
      this.parentNode.prepend(a);
    } catch {
      console.log("No selected found... populating with first value.")
    }
    // move newly selected item to top
    this.classList.toggle("selected")
    this.parentNode.parentNode.prepend(this);
    changeColour(rgbStringToHex(this.style.backgroundColor))
  }
}

function closeAllSelect(elmnt) {
  /*a function that will close all select boxes in the document,
  except the current select box:*/

  var x, y, xl, yl, arrNo = [];
  x = document.getElementsByClassName("item-list");
  y = document.getElementsByClassName("selected");
  xl = x.length;
  yl = y.length;
  for (var i = 0; i < yl; i++) {
    if (elmnt == y[i]) {
      arrNo.push(i)
    } 
  }
  for (i = 0; i < xl; i++) {
    if (arrNo.indexOf(i)) {
      x[i].classList.add("select-hide");
    }
  }
  saveLoadout()
}

/* is there a way I can save RGB colours so that they always map to the same value from 0-255: no. SO, instead, save a new val in th */
/* Save active loadout */
function saveLoadout() {
  var loadout = $("#loadouts .selected")
  var name = loadout.html()
  var idx = loadout.attr('value')
  if(name !== "") { // if the loadout is named, save it
    var lbls = $("#labels .selectable:not(.add)")
    var l = {}
    l['name'] = name
    var labels = {}

    $.each(lbls, function(index, elem) {
      //console.log(index, elem)
      labels[elem.getAttribute('value')] = {"name": elem.innerHTML}
    })
    l['labels'] = labels
    window.api.invoke('set_loadout', {idx, l})
  } else {
    console.log("LOADOUT NOT NAMED")
  }
}
