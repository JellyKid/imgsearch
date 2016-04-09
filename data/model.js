var mongoose = require('mongoose');

var searchSchema = mongoose.Schema({
  term: {
    type: String
  },
  when: {
    type: String
  }
});

var searchHistory = mongoose.model('searchHistory', searchSchema);

module.exports = searchHistory;
