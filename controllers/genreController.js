var async = require('async');
var validator = require('express-validator');

var Genre = require('../models/genre');
var Book = require('../models/book')

// Display list of all Genre.
exports.genre_list = function (req, res, next) {
  Genre.find()
    .sort('name')
    .exec()
    .then(list_genres => {
      res.render('genre_list', {title: 'Genre List', genre_list: list_genres});
    }).catch(err => next(err));
};

// Display detail page for a specific Genre.
exports.genre_detail = function (req, res) {
  async.parallel({
    genre: callback => {
      Genre
        .findById(req.params.id)
        .exec(callback);
    },
    genre_books: callback => {
      Book
        .find({'genre': req.params.id})
        .exec(callback);
    }
  }).catch(err => {
    return next(err);
  }).then(results => {
    if (results.genre == null) {
      var err = new Error('Genre not found');
      err.status = 404;
      return next(err);
    }
    res.render('genre_detail', {title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books});
  });
};

// Display Genre create form on GET.
exports.genre_create_get = function (req, res) {
  res.render('genre_form', {title: 'Create Genre'});
};

// Handle Genre create on POST.
exports.genre_create_post = [
  validator.body('name', 'Genre name required').trim().isLength({min: 1}),
  (req, res, next) => {
    const errors = validator.validationResult(req);
    let genre = new Genre({
      name: req.body.name
    });

    if (!errors.isEmpty()) {
      res.render('genre_form', {title: 'Create Genre', genre: genre, errors: errors.array()});
      return;
    }

    Genre.findOne({'name': req.body.name})
      .exec()
      .catch(err => next(err))
      .then(found_genre => {
        if (found_genre) {
          return res.redirect(found_genre.url);
        }
        genre.save()
          .catch(err => next(err))
          .then(_ => res.redirect(genre.url))
      });
  }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function (req, res) {
  res.send('NOT IMPLEMENTED: Genre delete GET');
};

// Handle Genre delete on POST.
exports.genre_delete_post = function (req, res) {
  res.send('NOT IMPLEMENTED: Genre delete POST');
};

// Display Genre update form on GET.
exports.genre_update_get = function (req, res) {
  res.send('NOT IMPLEMENTED: Genre update GET');
};

// Handle Genre update on POST.
exports.genre_update_post = function (req, res) {
  res.send('NOT IMPLEMENTED: Genre update POST');
};