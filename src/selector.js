var x, i, j, l, ll, selElmnt, a, itemList, c;

var colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe', '#008080', '#e6beff', '#9a6324', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075']
var highestValue = 1

function initializeSelector(changeColour, selector) {
  selElmnt = selector.getElementsByTagName('select')[0]
  console.log(selElmnt)
  ll = selElmnt.length;
  itemList = document.createElement("DIV");
  itemList.setAttribute("class", "select-items select-hide");
  selector.append(itemList);

  // Append colour options
  for (j = 0; j < ll; j++) {
    /*for each option in the original select element,
    create a new DIV that will act as an option item:*/
    c = document.createElement("DIV");
    c.setAttribute("class", "selectable");
    c.setAttribute("contenteditable", "true");

    c.innerHTML = selElmnt.options[j].innerHTML;
    itemList.append(c);

    if(selElmnt.parentNode.id === 'labels') {
      c.setAttribute("placeholder", selElmnt.options[j].value);
      c.setAttribute("value", selElmnt.options[j].value);
      c.style.backgroundColor = colors[selElmnt.options[j].value-1]
      if(selElmnt.options[j].value > highestValue) {
        highestValue = parseInt(selElmnt.options[j].value)
      }
    }

    c.addEventListener("click", labelClickEvent);
  }


  /* Add "+" button */
  c = document.createElement("DIV");
  c.setAttribute("class", "selectable add");
  c.innerHTML = "+";
  itemList.append(c);

  // Create a new label 
  c.addEventListener("click", function(e) {
    var lbl = document.createElement("DIV");
    lbl.setAttribute("class", "selectable selected-item");
    lbl.setAttribute("contenteditable", "true")

    if(selElmnt.parentNode.id === 'labels') {
      highestValue +=1
      lbl.setAttribute("placeholder", highestValue)
      lbl.setAttribute("value", highestValue);
      lbl.style.backgroundColor = colors[highestValue-1]
      changeColour(colors[highestValue-1])
    }

    lbl.addEventListener("click", labelClickEvent);

    // Move prior label back to item list
    try {
      a = this.parentNode.parentNode.firstChild;
      a.classList.toggle("selected-item")
      this.parentNode.prepend(a);
    } catch {
      console.log("No selected found... populating with first value.")
    }

    this.parentNode.parentNode.prepend(lbl);
  })

  // initialize the first item in list as selected item
  itemList.firstChild.classList.toggle("selected-item")
  changeColour(rgbStringToHex(itemList.firstChild.style.backgroundColor))
  itemList.parentNode.prepend(itemList.firstChild)


  /*if the user clicks anywhere outside the select box,
  then close all select boxes:*/
  document.addEventListener("click", closeAllSelect);
}

// when a label is clicked, change to that label
function labelClickEvent(e) {
  console.log(this.parentNode)
  if(this.classList.contains("selected-item")) {
    e.stopPropagation();
    closeAllSelect(this);
    this.parentNode.lastChild.classList.toggle("select-hide");

  } else {
    // if a new loadout is being selected, delete all label entries from the  previous loadout and reinitialize
    if(this.parentNode.parentNode.id === "loadouts") {
      $("#labels > select").html("")
      $("#labels > .selected-item").remove()
      $("#labels > .select-items").remove()

      window.api.invoke('get_loadouts', this.innerHTML)
      .then((loadout) => {
          for (const [label, label_data] of Object.entries(loadout)) {
              $("#labels > select").append('<option value='+label+' color = '+label_data['color']+' placeholder='+label+'>'+label_data['name']+'</option>');
          }
          initializeSelector(changeColour, document.getElementById('labels'));
      }).catch(function(err) {
          console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
      });
    }

    // move previouly selected node into item list
    try {
      a = this.parentNode.parentNode.firstChild;
      a.classList.toggle("selected-item")
      this.parentNode.prepend(a);
    } catch {
      console.log("No selected found... populating with first value.")
    }
    // move newly selected item to top
    this.classList.toggle("selected-item")
    this.parentNode.parentNode.prepend(this);
    changeColour(rgbStringToHex(this.style.backgroundColor))
  }
}

function closeAllSelect(elmnt) {
  /*a function that will close all select boxes in the document,
  except the current select box:*/

  var x, y, i, xl, yl, arrNo = [];
  x = document.getElementsByClassName("select-items");
  y = document.getElementsByClassName("selected-item");
  xl = x.length;
  yl = y.length;
  for (i = 0; i < yl; i++) {
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
  var loadout = $("#loadouts .selected-item").html()
  var labels = $("#labels .selectable:not(.add)")
  var l = {}
  $.each(labels, function(index, elem) {
    //console.log(index, elem)
    l[elem.getAttribute('value')] = {"name": elem.innerHTML}
  })
  window.api.invoke('set_loadout', {loadout, l})
}
