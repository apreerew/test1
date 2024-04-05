//get credentials from local file not included in source control
var fileName = "./config.json"
var config;

try {

  config = require(fileName);

} catch(err) {
  config = {}
  console.log("unable to read file '" + fileName + "': ", err);
  console.log("see secret-config-sample.json for an example");
}

module.exports = config;