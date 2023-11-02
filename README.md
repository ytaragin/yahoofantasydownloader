# Overview
This project is a collection of utilites to download fantasy football data from Yahoo and to upload it into a google sheets spreadhseet.

For various reasons, it is made up of two utilities:
* getdata.py
  A utility in python that downloads the league data and the scores for each week
* genandupload.js
  A Node utility that takes the XML files downloaded by the python tool and converts them to weekly scores and uploads to a google spreadsheet.

  