// 64 different colours
var drawColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#80FF00', '#8000FF', '#FF0080', '#00FF80', '#0080FF', '#FFFF80', '#FF80FF', '#80FFFF', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#FF8080', '#80FF80', '#8080FF', '#FF4040', '#40FF40', '#4040FF', '#FFFF40', '#FF40FF', '#40FFFF', '#A00000', '#00A000', '#0000A0', '#A0A000', '#A000A0', '#00A0A0', '#FFA0A0', '#A0FFA0', '#A0A0FF', '#A0A040', '#A040A0', '#40A0A0', '#FFC0C0', '#C0FFC0', '#C0C0FF', '#400000', '#004000', '#000040', '#404000', '#400040', '#004040', '#804040', '#408040', '#404080', '#804080', '#408080', '#FF8040', '#80FF40', '#8040FF', '#FF4080', '#40FF80', '#4080FF', '#FFFF90', '#FF90FF', '#90FFFF', '#A00040', '#00A040', '#0040A0', '#A0A040', '#A040A0', '#40A0A0', '#FFA0C0', '#A0FFC0', '#A0C0FF', '#C00000', '#00C000', '#0000C0', '#C0C000', '#C000C0', '#00C0C0', '#FFC0E0', '#C0FFE0', '#C0E0FF', '#600000', '#006000', '#000060', '#606000', '#600060', '#006060', '#906060', '#609060', '#606090', '#906090', '#609090', '#FF6060', '#60FF60', '#6060FF', '#FFFF60', '#FF60FF', '#60FFFF', '#E00000', '#00E000', '#0000E0', '#E0E000', '#E000E0', '#00E0E0', '#FFE0E0', '#E0FFE0', '#E0E0FF', '#E00060', '#00E060', '#0060E0', '#E0E060', '#E060E0', '#60E0E0', '#FFE0F0', '#E0FFF0', '#E0F0FF', '#900000', '#009000', '#000090', '#909000', '#900090', '#009090', '#B09090', '#90B090', '#9090B0', '#B090B0', '#90B0B0', '#FF9090', '#90FF90', '#9090FF', '#FFFF90', '#FF90FF', '#90FFFF'];
var fontColors = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];
var activeLabels = {}
function initLoadoutList(loadouts) {
  console.log("initLoadoutList(): ", loadouts)

  var items = $("#loadouts .items")[0]
  console.log(items)

  for (const loadout in loadouts) {
    if (loadouts.hasOwnProperty(loadout)) {    // Make sure the property belongs to the object itself, not its prototype

      var item = document.createElement("DIV");
      item.setAttribute("class", "selectable");
      item.setAttribute("contenteditable", "true");
      item.setAttribute("placeholder", "...");
      item.addEventListener("click", onSelectItem);
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
    lbl.addEventListener("click", onSelectItem);
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
  initLabelList(loadouts[$("#loadouts .selected")[0].innerHTML])

}

function initLabelList(labels) {
  activeLabels = labels
  console.log("initLabelList(): ", labels)
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
      item.addEventListener("click", onSelectItem);
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
    lbl.addEventListener("click", onSelectItem);
    // lbl.addEventListener('blur', onBlur) // if user clicks on canvas/ outside list, close list
    lbl.style.backgroundColor = drawColors[idx]
    lbl.style.color = fontColors[idx]
    changeActive({'colour': drawColors[idx], 'label': idx})
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

  // Create and add search box to list
  var searchBox = document.createElement("DIV");
  searchBox.setAttribute("class", "selectable selected search-box hidden");
  searchBox.setAttribute("contenteditable", "true");
  searchBox.setAttribute("placeholder", "Search...");
  searchBox.addEventListener("input", filterLabels);
  searchBox.addEventListener("blur", onBlur); // if user clicks on canvas/ outside search, close list

  // We do not want this close all open label when re-clicked on search.
  searchBox.addEventListener("click", function(e) {
    e.stopPropagation();
  });
  items.parentNode.prepend(searchBox);

    
  // now add selected item
  var initialSelected = items.firstChild
  initialSelected.classList.toggle("selected")
  items.parentNode.prepend(initialSelected)
  changeActive({'colour': rgbStringToHex(initialSelected.style.backgroundColor), 'label': initialSelected.innerHTML})

  // every time a label list is changed, ensure that if the user clicks anywhere outside the select box, then close all select boxes
  // document.addEventListener("click", closeList);

}

// when a label is clicked, change to that label
function onSelectItem(e) {

  // opened list
  if(this.classList.contains("selected") && !this.classList.contains("search-box") ) {
    var list = this.parentNode;
    var items = list.getElementsByClassName("items")[0]
    items.classList.toggle("hidden");
  
    console.log("Opened '" + list.id+"'")

    e.stopPropagation();

    if (list.id === "labels") {
      var searchBox = list.getElementsByClassName('search-box')[0];
      console.log(searchBox)
      searchBox.classList.toggle("hidden"); // hide search box
      searchBox.focus();
    }
    
  } else { // if unselected element (in items list)
    var list = this.parentNode.parentNode;
    var items = list.getElementsByClassName("items")[0]

    console.log("Opened '" + list.id+"'")
    if(list.id === "loadouts") {
      // if a new loadout is being selected, delete all label entries from the  previous loadout and reinitialize
      $("#labels > .selected").remove()
      $("#labels > .items").empty();
      window.api.invoke('get_loadouts', this.innerHTML)
      .then((loadout) => {
          initLabelList(loadout)
      }).catch(function(err) {
          console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
      });
    } else {
      items.classList.toggle("hidden");

      var searchBox = list.getElementsByClassName('search-box')[0];
      searchBox.classList.toggle("hidden"); // hide search box

      // propogate the colour of the selected item to the frontend
      changeActive({'colour': rgbStringToHex(this.style.backgroundColor), 'label': this.innerHTML})
    }

    // get item with class 'selected' but NOT 'search-box'
    var a = list.querySelectorAll('.selected:not(.search-box)')[0];
    a.classList.toggle("selected") // turn the selected to unselected
    items.prepend(a); // put back in the items list at the top

    // move newly selected item to top
    this.classList.toggle("selected")
    list.prepend(this);

  }
  resetSearch(); 

}

function onBlur(e) {
  var list = this.parentNode;
  var items = list.getElementsByClassName("items")[0]
  console.log("onBlur(e): ", e.relatedTarget)
  // if selected element is not an element in the list that the search bar is contained in, then close the list
  if(e.relatedTarget === null) {
    this.classList.toggle("hidden");
    items.classList.toggle("hidden");
  } else if(e.relatedTarget.classList.contains('selected')) {
    return;
  }else if(!e.relatedTarget.parentNode.classList.contains('items') || !e.relatedTarget.parentNode.parentNode.classList.contains('toolbar-list')) {
    this.classList.toggle("hidden");
    items.classList.toggle("hidden");
  } 
}

function filterLabels() {
  var input = this.innerText.toLowerCase();
  var labels = $("#labels .items")[0].getElementsByClassName("selectable");

  for (var i = 0; i < labels.length; i++) {
      var label = labels[i];
      if (!label.classList.contains("search-box")) {
          var txtValue = label.textContent || label.innerText;

          if (txtValue.toLowerCase().indexOf(input) > -1) {
              label.style.display = "";
          } else {
              label.style.display = "none";
          }
      }
  }
}


function resetSearch() {
  console.log("resetSearch()")
  // empty search box
  var searchBox = document.getElementsByClassName('search-box')[0];
  searchBox.innerText = '';
  var allLabels = $("#labels .items")[0].getElementsByClassName("selectable");
    for (var i = 0; i < allLabels.length; i++) {
        allLabels[i].style.display = "";
  }

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
