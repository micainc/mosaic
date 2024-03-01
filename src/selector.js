// should be 24
var drawColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#80FF00', '#8000FF', '#FF0080', '#00FF80', '#0080FF', '#FFFF80', '#FF80FF', '#80FFFF', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#FF8080', '#80FF80', '#8080FF', '#808080']
var fontColors = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF']

function setLoadoutList(loadouts) {
  var items = $("#loadouts .items")[0]
  console.log(items)

  for (const loadout in loadouts) {
    if (loadouts.hasOwnProperty(loadout)) {    // Make sure the property belongs to the object itself, not its prototype

      var item = document.createElement("DIV");
      item.setAttribute("class", "selectable");
      item.setAttribute("contenteditable", "true");
      item.setAttribute("placeholder", "...");
      item.addEventListener("click", handleItemClick);
      item.innerHTML = loadout;
      items.append(item)
    }
  }

  //Add "+" button to item list 
  var add = document.createElement("DIV");
  add.setAttribute("class", "selectable add");

  add.innerHTML = "+";
  //console.log(itemList)
  items.append(add);

  // Create a new label 
  add.addEventListener("click", function(e) {
    var lbl = document.createElement("DIV");
    lbl.setAttribute("class", "selectable selected");
    lbl.setAttribute("contenteditable", "true")
    lbl.setAttribute("placeholder", '...')
    lbl.addEventListener("click", handleItemClick);
    $("#labels > .selected").remove()
    $("#labels > .items").empty();
    activeCursor = false;

    // when add is clicked, move selected item into item-list. 
    try {
      var a = $("#loadouts")[0].firstChild;
      a.classList.toggle("selected")
      $("#loadouts > .items")[0].prepend(a)
    } catch {
      console.log("No selected item...")
    }

    this.parentNode.parentNode.prepend(lbl);
  })

  
    // initialize the first item in list as selected item
  items.firstChild.classList.toggle("selected")
  items.parentNode.prepend(items.firstChild)
  setLabelList(loadouts[$("#loadouts .selected")[0].innerHTML])

}

function setLabelList(labels) {
  console.log("LABELS: ", labels)
  // Initialize the labels list
  var items = $("#labels .items")[0]
  for(const label in labels) {
    if (labels.hasOwnProperty(label)) {    // Make sure the property belongs to the object itself, not its prototype
      var item = document.createElement("DIV");
      item.style.backgroundColor = drawColors[label]
      item.style.color = fontColors[label];
      item.setAttribute("class", "selectable");
      item.setAttribute("contenteditable", "true");
      item.setAttribute("placeholder", label+"...");
      item.setAttribute("value", label)
      item.addEventListener("click", handleItemClick);
      item.innerHTML = labels[label];
      items.append(item)
    }
  }

  //Add "+" button to item list 
  var add = document.createElement("DIV");
  add.setAttribute("class", "selectable add");
  add.innerHTML = "+";
  items.append(add);

  // Create a new label 
  add.addEventListener("click", function(e) {
    var idx = $("#labels .items")[0].childNodes.length // dont include 'add' button
    var lbl = document.createElement("DIV");
    lbl.setAttribute("class", "selectable selected");
    lbl.setAttribute("contenteditable", "true")
    lbl.setAttribute("placeholder", idx+'...')
    lbl.setAttribute("value", idx)
    lbl.addEventListener("click", handleItemClick);
    lbl.style.backgroundColor = drawColors[idx]
    lbl.style.color = fontColors[idx]
    changeColour(drawColors[idx])
    activeCursor = true;

    // when add is clicked, move selected item into item-list. 
    try {
      var a = $("#labels")[0].firstChild;
      a.classList.toggle("selected")
      $("#labels > .items")[0].prepend(a)
    } catch {
      console.log("No selected item...")
    }

    this.parentNode.parentNode.prepend(lbl);
  })

  items.firstChild.classList.toggle("selected")
  items.parentNode.prepend(items.firstChild)
  changeColour(rgbStringToHex($('#labels .selected').css('backgroundColor')));

  // every time a label list is changed, ensure that if the user clicks anywhere outside the select box, then close all select boxes
  document.addEventListener("click", closeAllSelect);

}

// when a label is clicked, change to that label
function handleItemClick(e) {
  if(this.classList.contains("selected")) {
    e.stopPropagation();
    closeAllSelect(this);
    this.parentNode.lastElementChild.classList.toggle("select-hide");

  } else { // if unselected element (in items list)
    if(this.parentNode.parentNode.id === "loadouts") {
      // if a new loadout is being selected, delete all label entries from the  previous loadout and reinitialize
      $("#labels > .selected").remove()
      $("#labels > .items").empty();
      window.api.invoke('get_loadouts', this.innerHTML)
      .then((loadout) => {
          setLabelList(loadout)
      }).catch(function(err) {
          console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
      });
    } else {
      changeColour(rgbStringToHex(this.style.backgroundColor))
    }

    // move previouly selected node into item list
    try {
      var a = this.parentNode.parentNode.firstChild; // item -> items list -> loadouts/labels container -> selected
      a.classList.toggle("selected") // turn the selected to unselected
      this.parentNode.prepend(a); // put back in the items list
    } catch {
      console.log("No selected found... populating with first value.")
    }
    // move newly selected item to top
    this.classList.toggle("selected")
    this.parentNode.parentNode.prepend(this);
  }
}

function closeAllSelect(elmnt) {
  /*a function that will close all select boxes in the document,
  except the current select box:*/

  var x, y, xl, yl, arrNo = [];
  x = document.getElementsByClassName("items");
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
  /*
  var name = $("#loadouts .selected").html()
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
    window.api.invoke('set_loadout', {name, l})
  } else {
    console.log("LOADOUT NOT NAMED")
  }
  */
}
