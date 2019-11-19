var CLIENT_ID = '';
var CLIENT_SECRET = '';
var PAGE_ID = ''; // get from https://www.facebook.com/help/1503421039731588 or set as 'me' to post to your own feed

// https://developers.facebook.com/tools/explorer
// get access token
// page token
//  pages_show_list
//  manage_pages
//  publish_pages
//  publish_video

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Livestream').addItem('Schedule Livestream', 'scheduleLivestream').addToUi();
}

// this was edited from run() in facebook_oauth.gs https://github.com/gsuitedevs/apps-script-oauth2/blob/master/samples/Facebook.gs
function scheduleLivestream() {
  var service = getService();
  if (service.hasAccess()) {

    var newDate = generateDate();
    var planned_start_time = String(newDate.getTime() / 1000); // convert from miliseconds to seconds since epoch
    var title = generateTitle(newDate);
    var status = 'SCHEDULED_UNPUBLISHED'; // UNPUBLISHED, LIVE_NOW, SCHEDULED_UNPUBLISHED, SCHEDULED_LIVE, SCHEDULED_CANCELED
    var url = 'https://graph.facebook.com/v5.0/'+PAGE_ID+'/live_videos?status='+status+'&planned_start_time='+planned_start_time+'&title='+title;
    var page_access_token = getPageAccessToken(page);
    var response = UrlFetchApp.fetch(url, {'method': 'post', headers: {'Authorization': 'Bearer ' + page_access_token}});
    var result = JSON.parse(response.getContentText());
    var id = result.id;
    var secure_stream_url = result.secure_stream_url;
    writeToSpreadsheet(newDate, title, id, secure_stream_url);
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
    writeToSpreadsheet('Open the following URL and re-run the script: %s', '', '', authorizationUrl);
  }
}

function getPageAccessToken(page) {
  var service = getService();
  Logger.log('Access Token');
  Logger.log(service.getAccessToken());
  var url = 'https://graph.facebook.com/v5.0/'+page+'?fields=access_token';
  //var url = 'https://graph.facebook.com/v5.0/me/accounts';
  var response = UrlFetchApp.fetch(url, {'method': 'get', headers: {'Authorization': 'Bearer ' + service.getAccessToken()}});
  var result = JSON.parse(response.getContentText());
  var page_access_token = result.access_token;
  return page_access_token;
}

// Configure the service, from https://github.com/gsuitedevs/apps-script-oauth2/blob/master/samples/Facebook.gs
function getService() {
  return OAuth2.createService('Facebook')
    // Set the endpoint URLs.
    .setAuthorizationBaseUrl('https://www.facebook.com/dialog/oauth')
    .setTokenUrl('https://graph.facebook.com/v5.0/oauth/access_token')
    // Set the client ID and secret.
    .setClientId(CLIENT_ID)
    .setClientSecret(CLIENT_SECRET)
    // Set the name of the callback function that should be invoked to complete the OAuth flow.
    .setCallbackFunction('authCallback')
    // Set the property store where authorized tokens should be persisted.
    .setPropertyStore(PropertiesService.getUserProperties()); // https://developers.google.com/apps-script/reference/properties
}

function generateDate() {
  var dateNow = new Date();
  var year = dateNow.getFullYear();
  var month = dateNow.getMonth();
  // change the first 7 in this next line to 8 if you want next Monday, or 9 if Tuesday etc.
  var day = dateNow.getDate() + ((7 - dateNow.getDay()) % 7); // next Sunday, idea from https://stackoverflow.com/questions/33078406/getting-the-date-of-next-monday
  var newDate = new Date(year, month, day, 10, 25);
  //Logger.log(newDate.toISOString());
  return newDate;
}

function generateTitle(newDate) {
  var year = newDate.getFullYear();
  var month = newDate.getMonth();
  var day = newDate.getDate();
  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];  // https://www.w3schools.com/js/js_date_methods.asp
  var title = 'Show for ' + months[newDate.getMonth()] + ' ' + day + ', ' + year;
  return title;
}

function writeToSpreadsheet(newDate, title, id, secure_stream_url) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  var scheduledDate = newDate.toISOString().split('T')[0];
  sheet.getRange(lastRow+1, 1, 1, 4).setValues([[scheduledDate, title, id, secure_stream_url]]); // rows, columns, numRows, numColumns
}

// Handle the OAuth callback
function authCallback(request) {
  var service = getService();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Success!');
  } else {
    return HtmlService.createHtmlOutput('Denied.');
  }
}

// Log the redirect URI to register under Facebook Login settings at https://developers.facebook.com/apps/{appID}/fb-login/settings/
function logRedirectUri() {
  var service = getService();
  Logger.log(service.getRedirectUri());
}

// Reset the authorization state, so that it can be re-tested.
function resetAuthorization() {
  getService().reset();
}
