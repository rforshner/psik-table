"use strict";

const query = `query Get_book_fulldata_by_book_id($book_id: ID!) {
    get_book_fulldata_by_book_id(book_id: $book_id) {
        book_name
        book_authors
        book_year
        book_publishers {
            publisher_name
        }
        categories {
            category_name
        }
        book_id
        book_s3_file
        book_tags
    }
}`;

let counterDiv;
const table = document.getElementById('table');

function updateCounter() {
  if (!counterDiv) return;
  const rows = document.querySelectorAll("#table tr:not(:first-child)");
  counterDiv.textContent = "מספר ספרים: " + rows.length;
}

async function book_details(book_id) {
  return fetch('https://api-ebooks.psik.io/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: { 'book_id': book_id }
    })
  }).then(r => r.json())
    .then(obj => obj.data.get_book_fulldata_by_book_id)
    .catch(console.error);
}

async function displayTable(book_id) {
  const data = await book_details(book_id);

  if (data === null) {
    const row = document.createElement('tr');
    const bookIdCell = document.createElement('td');
    bookIdCell.textContent = book_id;
    row.appendChild(bookIdCell);

    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('td');
      cell.textContent = 'Book not found';
      row.appendChild(cell);
    }

    table.appendChild(row);
  } else {
    const row = document.createElement('tr');

    const bookIdCell = document.createElement('td');
    bookIdCell.textContent = data.book_id;
    row.appendChild(bookIdCell);

    const bookNameCell = document.createElement('td');
    bookNameCell.textContent = data.book_name;
    row.appendChild(bookNameCell);

    const authorsCell = document.createElement('td');
    authorsCell.textContent = data.book_authors.join(', ');
    row.appendChild(authorsCell);

    const yearCell = document.createElement('td');
    yearCell.textContent = data.book_year;
    row.appendChild(yearCell);

    const publishersCell = document.createElement('td');
    publishersCell.textContent = data.book_publishers.map(pub => pub.publisher_name).join(', ');
    row.appendChild(publishersCell);

    const categoryCell = document.createElement('td');
    categoryCell.textContent = data.categories.map(cat => cat.category_name).join(', ');
    row.appendChild(categoryCell);

    const bookS3FileCell = document.createElement('td');
    bookS3FileCell.textContent = data.book_s3_file;
    row.appendChild(bookS3FileCell);

    const booktagsCell = document.createElement('td');
    booktagsCell.textContent = data.book_tags.join(', ');
    row.appendChild(booktagsCell);

    table.appendChild(row);
  }

  const rows = table.getElementsByTagName('tr');
  const rowsArray = Array.from(rows);
  rowsArray.shift();

  rowsArray.sort((a, b) => {
    const bookIdA = a.getElementsByTagName('td')[0].textContent;
    const bookIdB = b.getElementsByTagName('td')[0].textContent;
    return bookIdA - bookIdB;
  });

  rowsArray.forEach(row => {
    if (row.dataset.journalArticle === "true") {
      table.appendChild(row);
      return;
    }

    const bookS3FileCell = row.querySelector('td:nth-child(7)');
    const bookS3FileText = bookS3FileCell ? bookS3FileCell.textContent : '';

    if (bookS3FileText.includes('Journals')) {
      row.dataset.journalArticle = "true";

      Array.from(row.cells).forEach((cell, index) => {
        if (index !== 0) {
          if (index === 1) {
            cell.textContent = 'Journal article';
          } else {
            cell.textContent = '';
          }
        }
      });
    }

    table.appendChild(row);
  });

  updateCounter();
}

const headingsRow = document.createElement('tr');

["Book ID","Book Name","Authors","Year","Publishers","Category","Book S3 File","Book tags"]
.forEach(text=>{
  const th=document.createElement("th");
  th.textContent=text;
  headingsRow.appendChild(th);
});

table.appendChild(headingsRow);

document.getElementById('search').addEventListener('keyup', function (event) {
  if (event.key !== 'Enter') return;

  const input = this.value.trim();
  if (!input) return;

  const parts = input.split(/[\s,]+/);

  parts.forEach(part => {
    if (!part) return;

    if (part.includes('-')) {
      const [a,b] = part.split('-');
      const from = Math.min(parseInt(a), parseInt(b));
      const to = Math.max(parseInt(a), parseInt(b));
      for (let i = from; i <= to; i++) displayTable(i);
    } else {
      displayTable(parseInt(part));
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {

  counterDiv = document.createElement("div");
  counterDiv.style.fontWeight = "bold";
  counterDiv.style.margin = "8px 0";
  document.body.insertBefore(counterDiv, table);
  updateCounter();

  function makeBookLinks() {
    const rows = document.querySelectorAll("#table tr:not(:first-child)");
    rows.forEach(row => {
      if (row.dataset.journalArticle === "true") return;

      const id=row.cells[0].textContent.trim();
      const nameCell=row.cells[1];

      if (!nameCell.querySelector("a")) {
        const a=document.createElement("a");
        a.href=`https://ebooks.psik.io/book/${id}/%D7%94/`;
        a.target="_blank";
        a.textContent=nameCell.textContent;
        nameCell.innerHTML="";
        nameCell.appendChild(a);
      }
    });

    buttonOpenAll.style.display="inline-block";
  }

  function openAllLinks(){
    const links=document.querySelectorAll('#table td:nth-child(2) a');
    if(!links.length)return;
    if(!confirm(`ייפתחו ${links.length} טאבים. להמשיך?`))return;
    links.forEach(l=>window.open(l.href,"_blank"));
  }

  async function copyUrls(){
    const rows=document.querySelectorAll("#table tr:not(:first-child)");
    const arr=[];
    rows.forEach(r=>{
      if(r.dataset.journalArticle==="true")return;
      arr.push(`https://ebooks.psik.io/book/${r.cells[0].textContent.trim()}/%D7%94/`);
    });
    await navigator.clipboard.writeText(arr.join("\n"));
  }

  function clearList(){
    document.querySelectorAll("#table tr:not(:first-child)").forEach(r=>r.remove());
    document.getElementById("search").value="";
    buttonOpenAll.style.display="none";
    updateCounter();
  }

  const wrap=document.createElement("div");
  wrap.style.display="flex";
  wrap.style.gap="8px";
  wrap.style.margin="8px 0";

  const b1=document.createElement("button");
  b1.textContent="הפוך שמות להיפרלינקים";
  b1.onclick=makeBookLinks;

  const b2=document.createElement("button");
  b2.textContent="העתק URLs";
  b2.onclick=copyUrls;

  const b3=document.createElement("button");
  b3.textContent="נקה רשימה";
  b3.onclick=clearList;

  const buttonOpenAll=document.createElement("button");
  buttonOpenAll.textContent="פתח הכל";
  buttonOpenAll.style.display="none";
  buttonOpenAll.onclick=openAllLinks;

  wrap.appendChild(b1);
  wrap.appendChild(b2);
  wrap.appendChild(b3);
  wrap.appendChild(buttonOpenAll);

  document.body.insertBefore(wrap, table);
});