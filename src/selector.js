// 64 different colours
var drawColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8000', '#80FF00', '#8000FF', '#FF0080', '#00FF80', '#0080FF', '#FFFF80', '#FF80FF', '#80FFFF', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#FF8080', '#80FF80', '#8080FF', '#FF4040', '#40FF40', '#4040FF', '#FFFF40', '#FF40FF', '#40FFFF', '#A00000', '#00A000', '#0000A0', '#A0A000', '#A000A0', '#00A0A0', '#FFA0A0', '#A0FFA0', '#A0A0FF', '#A0A040', '#A040A0', '#40A0A0', '#FFC0C0', '#C0FFC0', '#C0C0FF', '#400000', '#004000', '#000040', '#404000', '#400040', '#004040', '#804040', '#408040', '#404080', '#804080', '#408080', '#FF8040', '#80FF40', '#8040FF', '#FF4080', '#40FF80', '#4080FF', '#FFFF90', '#FF90FF', '#90FFFF', '#A00040', '#00A040', '#0040A0', '#A0A040', '#A040A0', '#40A0A0', '#FFA0C0', '#A0FFC0', '#A0C0FF', '#C00000', '#00C000', '#0000C0', '#C0C000', '#C000C0', '#00C0C0', '#FFC0E0', '#C0FFE0', '#C0E0FF', '#600000', '#006000', '#000060', '#606000', '#600060', '#006060', '#906060', '#609060', '#606090', '#906090', '#609090', '#FF6060', '#60FF60', '#6060FF', '#FFFF60', '#FF60FF', '#60FFFF', '#E00000', '#00E000', '#0000E0', '#E0E000', '#E000E0', '#00E0E0', '#FFE0E0', '#E0FFE0', '#E0E0FF', '#E00060', '#00E060', '#0060E0', '#E0E060', '#E060E0', '#60E0E0', '#FFE0F0', '#E0FFF0', '#E0F0FF', '#900000', '#009000', '#000090', '#909000', '#900090', '#009090', '#B09090', '#90B090', '#9090B0', '#B090B0', '#90B0B0', '#FF9090', '#90FF90', '#9090FF', '#FFFF90', '#FF90FF', '#90FFFF'];
var fontColors = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#FFFFFF', '#FFFFFF', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#FFFFFF', '#000000', '#000000', '#000000', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'];

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
  console.log("clicked on ")
  if(this.classList.contains("selected")) {
    e.stopPropagation();
    closeAllSelect(this);
    this.parentNode.lastElementChild.classList.toggle("select-hide");
    
    console.log("partent id" , this.parentNode.parentNode.id)

    if (this.parentNode.id === "labels" && !this.classList.contains("search-box")) {
      var labelList = this.parentNode;
      var selectedLabel = labelList.removeChild(this);
      selectedLabel.classList.remove("selected");
      labelList.children[0].appendChild(selectedLabel);

      // Create and add a search box
      var searchBox = document.createElement("DIV");
      searchBox.setAttribute("class", "selectable selected search-box");
      searchBox.setAttribute("contenteditable", "true");
      searchBox.setAttribute("placeholder", "Search...");
      searchBox.addEventListener("input", filterLabels);
      searchBox.addEventListener("blur", handleSearchBlur);

      // We do not want this close all open label when re-clicked on search.
      searchBox.addEventListener("click", function(e) {
        e.stopPropagation();
      });
      labelList.prepend(searchBox);

      searchBox.focus();
    }
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

    clearSearchBoxAndClearSeclectablesDisplay(); 
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

function handleSearchBlur(event) {
  // Wait for the document to update and check if the new focused element is a label
  setTimeout(() => {
      const newFocus = document.activeElement;
      const isLabelItem = newFocus.classList.contains("selectable");
      const labelList = document.getElementById("labels");

      if (!isLabelItem && labelList) {
        clearSearchBoxAndClearSeclectablesDisplay()
        
          // Find the last label item and select it
          const lastLabelItem = labelList.querySelector('.items').lastElementChild;
          if (lastLabelItem && !lastLabelItem.classList.contains("add")) {
              // Reset the selection
              var currentlySelected = labelList.querySelector('.selected');
              if (currentlySelected) {
                  currentlySelected.classList.remove('selected');
              }
              lastLabelItem.classList.add('selected');

              lastLabelItem.remove()
              labelList.prepend(lastLabelItem)
          }
      }
  }, 0);
}

function clearSearchBoxAndClearSeclectablesDisplay() {
  var searchBox = document.querySelector("#labels .search-box");
  if (searchBox) {
      searchBox.parentNode.removeChild(searchBox);
  }
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
