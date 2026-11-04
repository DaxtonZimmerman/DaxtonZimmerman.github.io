/** Portfolio inquiry receiver. Sends only to Daxton; does not read Gmail. */
function doGet() {
  return jsonResult_({ ready: true });
}
function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 12000)
      return jsonResult_({ accepted: false });
    var data = JSON.parse(e.postData.contents);
    if (!validInquiry_(data)) return jsonResult_({ accepted: false });
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) return jsonResult_({ accepted: false });
    try {
      var cache = CacheService.getScriptCache();
      var digest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        data.email.toLowerCase(),
      );
      var key = Utilities.base64EncodeWebSafe(digest);
      var count = Number(cache.get(key) || 0);
      var total = Number(cache.get('hourly-total') || 0);
      if (count >= 3 || total >= 12 || MailApp.getRemainingDailyQuota() < 1)
        return jsonResult_({ accepted: false });
      // Reserve capacity before sending, so retries cannot exceed the limit.
      cache.put(key, String(count + 1), 3600);
      cache.put('hourly-total', String(total + 1), 3600);
      MailApp.sendEmail({
        to: 'daxtonmz0021@gmail.com',
        replyTo: data.email,
        subject: 'Website inquiry: ' + data.type,
        name: 'Daxton Portfolio',
        body:
          'Name: ' +
          data.name +
          '\nEmail: ' +
          data.email +
          '\nAbout: ' +
          data.type +
          '\n\n' +
          data.message,
      });
      return jsonResult_({ accepted: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return jsonResult_({ accepted: false });
  }
}
function validInquiry_(data) {
  return (
    !!data &&
    !data._honey &&
    typeof data.name === 'string' &&
    data.name.trim().length > 0 &&
    data.name.length <= 100 &&
    !/[\r\n]/.test(data.name) &&
    typeof data.email === 'string' &&
    data.email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    typeof data.message === 'string' &&
    data.message.trim().length >= 10 &&
    data.message.length <= 5000 &&
    ['website', 'role', 'other'].indexOf(data.type) >= 0
  );
}
function jsonResult_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function testEmailPermission() {
  // Run only after the owner authorizes sending email; sends one setup test to himself.
  MailApp.sendEmail(
    'daxtonmz0021@gmail.com',
    'Portfolio receiver setup test',
    'The portfolio inquiry receiver can send email. This is a setup test.',
  );
}
