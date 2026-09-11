## Locally Hosted Django Journal  [![Python tests](https://github.com/Mazchoo/JournalApp/actions/workflows/main.yml/badge.svg)](https://github.com/Mazchoo/JournalApp/actions/workflows/main.yml) [![Frontend tests](https://github.com/Mazchoo/JournalApp/actions/workflows/frontend.yml/badge.svg)](https://github.com/Mazchoo/JournalApp/actions/workflows/frontend.yml)

![image](https://github.com/user-attachments/assets/128a3324-0bcd-4357-849a-61475f4ace0e)

## Description

Creates a locally hosted journal app that can store images, text, html, meshes and video.

* Organises entries by year, month and day in respective calendars
* Has random selections of photos shown by year and month

The `ENTRY_FOLDER` folder contains all images and videos organised by folder `yyyy/mm/dd` and is private. 

## Installation

To run locally:

```
pip install -r requirements.txt
python manage.py runserver
Open up address on browser at "http://127.0.0.1:8000/"
```

## Sample screenshots

![Screenshot 2025-05-25 203514](https://github.com/user-attachments/assets/e25a6d68-151e-465f-847a-ecbe356c82c3)

![Screenshot 2025-05-25 203603](https://github.com/user-attachments/assets/039060c4-b1ad-4b0f-b4f5-c3a92c904a93)

## Usage

### Adding paragraphs to a page

Open a day from the month calendar with the pencil button. On that day's page you can add text in two ways:

* **New Paragraph** at the bottom of the page adds a text block at the end of the entry.
* The **paragraph button** beside an existing block inserts a new paragraph immediately above that block.

Click in the editor to write. When you are finished, use **Save** to keep the content. The height of the editor can be adjusted by dragging the bottom of the editor and is also saved.

![Adding a paragraph to a day page](static/Image/Examples/Paragraph.png)

#### Import HTML

A paragraph can also show a raw HTML document instead of the usual editor. In the paragraph toolbar, use **Import HTML** and choose a `.html` or `.htm` file.

The document replaces that paragraph and is shown as it would appear in a browser. Click the preview to edit the raw HTML. Use **Save** to keep the raw html content.

![Importing an HTML document](static/Image/Examples/Html.png)

#### Import Markdown

In the paragraph toolbar, use **Import Markdown** and choose a `.md` or `.markdown` file.

Supported markdown features are shown in the editor. The editor largely supports markdown text features.

![Importing a markdown document](static/Image/Examples/Markdown.png)

### Adding media to a page

On a day's page you can add photos, video, or a 3D mesh in two ways:

* **New Media** at the bottom of the page adds a media block at the end of the entry.
* The **picture button** beside an existing block inserts a new media block immediately above it.

Use **Choose file** to pick one or more files. The type is chosen from the file extension.

![Adding media to a day page](static/Image/Examples/Media.png)

#### Images

Click an image to view it at full resolution.

Supported types: **.png**, **.jpg**, **.jpeg**, **.jfif** and **.svg**.

![An image in a journal entry](static/Image/Examples/Image.png)

#### Video

Videos play in place with playback controls. On a reloaded page, click the video frames collage to view the video.

Supported type: **.mp4**.

![A video in a journal entry](static/Image/Examples/Video.png)

#### Mesh

A mesh is shown as a 3D model you can view in the entry. Click the model first so the controls apply to it:

* **Middle-click and drag** to orbit around the model.
* **Scroll the mouse wheel** to zoom in and out.
* **W A S D** to pan up, left, down, and right.
* **Q** and **E** to roll the view.

Supported type: **.glb**.

![A 3D mesh in a journal entry](static/Image/Examples/Mesh.png)

### Navigating the calendar

Entries are organised as years, then months, then days.

* **Home** in the top bar shows every year as a carousel. Click a year to open it, or use the previous and next arrows to browse years.
* On a **year** page, click a month to open its calendar. The arrows in the top bar move to the previous or next year.
* The **month** calendar shows each day. Click the pencil to open that day's entry. A filled pencil means an entry already exists; an outlined pencil is an empty day you can start writing. Use the arrows to move between months, or click the year in the top bar to go back.
* On a **day** page, the top bar links to the year and month. The arrows move to the previous or next day.
* **Latest** in the top bar jumps to the entry you edited most recently.

![Navigating the calendar](static/Image/Examples/Calendar.png)

