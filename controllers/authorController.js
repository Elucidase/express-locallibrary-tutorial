var async = require('async');
const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');

var Author = require('../models/author');
var Book = require('../models/book');


// Display list of all Authors.
exports.author_list = function (req, res, next) {
  Author.find()
    .sort([['family_name', 'ascending']])
    .exec((err, list_authors) => {
      if (err) { return next(err); }
      res.render('author_list', { title: 'Author List', author_list: list_authors });
    });
};

// Display detail page for a specific Author.
exports.author_detail = function (req, res, next) {
  async.parallel({
    author: function (callback) {
      Author.findById(req.params.id)
        .exec(callback)
    },
    authors_books: function (callback) {
      Book.find({ 'author': req.params.id }, 'title summary')
        .exec(callback)
    },
  }, function (err, results) {
    if (err) { return next(err); } // Error in API usage.
    if (results.author == null) { // No results.
      var err = new Error('Author not found');
      err.status = 404;
      return next(err);
    }
    // Successful, so render.
    res.render('author_detail', { title: 'Author Detail', author: results.author, author_books: results.authors_books });
  });
};

// Dispay Author create form on GET.
exports.author_create_get = function (req, res, next) {
  res.render('author_form', {title: 'Create Author'});
};

// Handle Author create on POST.
exports.author_create_post = [
  body('first_name')
    .trim().isLength({min: 1}).withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  body('family_name')
    .trim().isLength({min: 1}).withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  body('date_of_birth', 'Invalid date of birth').optional({checkFalsy: true}).isISO8601(),
  body('date_of_death', 'Invalid date of death').optional({checkFalsy: true}).isISO8601(),
  sanitizeBody('date_of_birth').toDate(),
  sanitizeBody('date_of_death').toDate(),
  (req, res, next) => {
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
      return res.render('author_form', {title: 'Create Author', author: req.body, errors: errors.array()});
    }
    let author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death
    });
    author.save()
      .catch(err => next(err))
      .then(_ => res.redirect(author.url));
  }

];

// Display Author delete form on GET.
exports.author_delete_get = function (req, res, next) {
  async.parallel({
    author: callback => void Author.findById(req.params.id).exec(callback),
    author_books: callback => void Book.find({'author': req.params.id}).exec(callback)
  }).catch(err => void next(err))
    .then(results => {
      if (results.author == null) { // No results
        res.redirect('/catalog/authors');
      }
      res.render('author_delete', {title: 'Delete Author', author: results.author, author_books: results.author_books});
    })
};

// Display Author delte on POST.
exports.author_delete_post = function (req, res, next) {
  async.parallel({
    author: callback => void Author.findById(req.body.authorid).exec(callback),
    author_books: callback => void Book.find({'author': req.body.authorid}).exec(callback)
  }).catch(err => void next(err))
    .then(results => {
      if (results.author_books.length > 0) {
        res.render('author_delete', {title: 'Delete Author', author: results.author, author_books: results.author_books});
        return;
      }
      Author.findByIdAndRemove(req.body.authorid)
        .exec()
        .catch(err => void next(err))
        .then(_ => void res.redirect('/catalog/authors'));
    })
};

// Display Author update form on GET.
exports.author_update_get = function (req, res) {
  res.send('NOT IMPLEMENTED: Author update GET');
};

// Handle Author update on POST.
exports.author_update_post = function (req, res) {
  res.send('NOT IMPLEMENTED: Author update POST');
};
