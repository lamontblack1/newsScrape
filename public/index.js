// Get the modal
var modal = document.getElementById("myModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

$("#scrape-button").on("click", function () {
  $.get("/scrape", function (data) {
    let numAdded = 0;
    if (data.code === 11000) {
      numAdded = data.insertedDocs.length;
    } else {
      numAdded = data.length;
    }
    console.log(data);
    //show popup and reload the page to get the latest articles
    displayModal(numAdded);
  });
});

function displayModal(numAdded) {
  if (numAdded === 0) {
    $("#numAdded").text(
      "No new articles added. You must have recently scraped the news!"
    );
  } else {
    $("#numAdded").text(numAdded + " Articles Added!");
  }
  $("#myModal").modal("show");
}

$(".close").on("click", function () {
  $("#myModal").modal("hide");
  location.reload();
});

$(".closeNewNote").on("click", function () {
  $("#newNote").val("");
  $("#newNoteModal").modal("hide");
});

$(".see-note").on("click", function () {
  const articleId = $(this).attr("data-id");
  renderNotes(articleId);
});

$(".add-note").on("click", function () {
  const articleId = $(this).attr("data-id");
  displayNewNoteModal(articleId);
});
function displayNewNoteModal(articleId) {
  $("#newNoteLabel").text("New Note for id: " + articleId);
  $("#newNote").attr("data-id", articleId);
  $("#newNoteModal").modal("show");
}

$("#saveNote").on("click", function () {
  const articleId = $("#newNote").attr("data-id");
  const newNote = $("#newNote").val();
  const $seeNotesBtn = $("button.see-note[data-id='" + articleId + "']");
  const numNotesNew = parseInt($seeNotesBtn.attr("data-num-notes")) + 1;
  $.post("/article/" + articleId, { body: newNote }, function (response) {
    renderNotes(articleId);
    $("#newNoteModal").modal("hide");
    $("#newNoteLabel").text("");
    $("#newNote").attr("data-id", "");
    $("#newNote").val("");
    //reset the number of notes listed on the button
    $seeNotesBtn.attr("data-num-notes", numNotesNew);
    $seeNotesBtn.text(numNotesNew + " notes");
  });
});
//render the associated notes for the article
function renderNotes(articleId) {
  let $noteContainer = $("#noteContainer");
  $noteContainer.empty();
  $.get("/article/" + articleId, function (response) {
    if (response.notes.length === 0) {
      $noteContainer.append(
        "<h5>There are no notes for article: " + response.title + "</h5>"
      );
    } else {
      $noteContainer.append(
        "<h5>" + response.title.substring(0, 20) + "...</h5>"
      );
      for (let i = 0; i < response.notes.length; i++) {
        const k = i + 1;
        const thisNote = response.notes[i].body;
        let appendStr =
          '<div class="card"><div class="card-body"><h5 class="card-title">';
        appendStr += "Note " + k;
        appendStr += '</h5><p class="card-text">';
        appendStr += thisNote;
        appendStr +=
          '</p><hr><button type="button" class="btn btn-danger delete-note" data-id="' +
          response.notes[i]._id +
          '" data-articleId="' +
          response._id +
          '">Delete</button></div></div>';

        $noteContainer.append(appendStr);
      }
    }
  });
}
//delete note button
$(document).on("click", "button.delete-note", function () {
  const noteId = $(this).attr("data-id");
  const articleId = $(this).attr("data-articleId");

  const $seeNotesBtn = $("button.see-note[data-id='" + articleId + "']");
  const numNotesNew = parseInt($seeNotesBtn.attr("data-num-notes")) - 1;

  $.ajax({
    url: "/api/deletenote/" + noteId,
    type: "DELETE"
  }).then(function (articleItem) {
    renderNotes(articleId);
    //reset the number of notes listed on the button
    $seeNotesBtn.attr("data-num-notes", numNotesNew);
    $seeNotesBtn.text(numNotesNew + " notes");
  });
});
// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == $("#myModal")) {
    $("#myModal").modal("hide");
    location.reload();
  }
};
