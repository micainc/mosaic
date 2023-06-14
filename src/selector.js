var x, i, j, l, ll, selElmnt, a, b, c;

function initializeCustomSelectors(changeColour) {

  /*look for any elements with the class "custom-select":*/
  x = document.getElementsByClassName("custom-select");
  l = x.length;
  for (i = 0; i < l; i++) {
    selElmnt = x[i].getElementsByTagName("select")[0];

    ll = selElmnt.length;
    b = document.createElement("DIV");
    b.setAttribute("class", "select-items select-hide");
    x[i].append(b);

    // Append colour options
    for (j = 0; j < ll; j++) {
      /*for each option in the original select element,
      create a new DIV that will act as an option item:*/
      c = document.createElement("DIV");
      c.setAttribute("class", "selectable");
      c.innerHTML = selElmnt.options[j].innerHTML;
      c.style.backgroundColor = selElmnt.options[j].getAttribute('color')
      if(selElmnt.id=='labels') {
        c.style.color = "#FFFFFF";
      }
      b.append(c);
      c.addEventListener("click", function(e) {
        if(this.classList.contains("selected-item")) {
          console.log("FLAG 1: ", this)
          e.stopPropagation();
          closeAllSelect(this);
          this.parentNode.lastChild.classList.toggle("select-hide");
        } else {
          console.log("FLAG 2: ", this)
          // move previouly selected node into item list
          try {
            a = this.parentNode.parentNode.firstChild;
            a.classList.toggle("selected-item")
            this.parentNode.prepend(a);
          } catch {
            console.log("No selected found... populating with first value.")
          }
          this.classList.toggle("selected-item")
          this.parentNode.parentNode.prepend(this);
          changeColour(this.style.backgroundColor)
        }
      });
    }

    /* Add "+" button */
    c = document.createElement("DIV");
    c.setAttribute("class", "selectable");
    c.innerHTML = "+";
    c.style.backgroundColor = "#FFFFFF";
    c.style.color = "#161616";
    b.append(c);

    // now initialize the first item
    b.firstChild.classList.toggle("selected-item")
    b.parentNode.prepend(b.firstChild)

    /*
    c.addEventListener("click", function(e) {
      lbl = document.createElement("DIV");
      lbl.setAttribute("contenteditable", "true")
      lbl.innerHTML = "...";

      b.insertBefore(lbl, b.firstChild);
    })
    */
 
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

  }
  /*if the user clicks anywhere outside the select box,
  then close all select boxes:*/
  document.addEventListener("click", closeAllSelect);

}
