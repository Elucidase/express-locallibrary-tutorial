var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');
let debug = require('debug')('book');

var async = require('async');
const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');


exports.index = function (req, res) {
  async.parallel({
    book_count: function (callback) {
      Book.countDocuments({}, callback);
    },
    book_instance_count: function (callback) {
      BookInstance.countDocuments({}, callback);
    },
    book_instance_available_count: function (callback) {
      BookInstance.countDocuments({ status: 'Available' }, callback);
    },
    author_count: function (callback) {
      Author.countDocuments({}, callback);
    },
    genre_count: function (callback) {
      Genre.countDocuments({}, callback);
    }
  }, function (err, results) {
    res.render('index', { title: 'Local Library Home', error: err, data: results });
  });
};

// Display list of all books.
exports.book_list = function (req, res) {
  Book.find({}, 'title author')
    .populate('author')
    .exec(function (err, list_books) {
      if (err) { return next(err); }
      res.render('book_list', { title: 'Book List', book_list: list_books });
    });
};

// Display detail page for a specific book.
exports.book_detail = function (req, res, next) {
  async.parallel({
    book: callback => {
      Book.findById(req.params.id)
        .populate('author')
        .populate('genre')
        .exec(callback);
    },
    book_instance: callback => {
      BookInstance.find({ book: req.params.id })
        .exec(callback);
    }
  }).catch(err => {
    return next(err);
  }).then(results => {
    if (results.book == null) {
      var err = new Error('Book not found');
      err.status = 404;
      return next(err);
    }
    res.render('book_detail', { title: results.book.title, book: results.book, book_instances: results.book_instance });
  });
};

// Display book create form on GET.
exports.book_create_get = function (req, res, next) {

  // Get all authors and genres, which we can use for adding to our book.
  async.parallel({
    authors: function (callback) {
      Author.find(callback);
    },
    genres: function (callback) {
      Genre.find(callback);
    },
  }, function (err, results) {
    if (err) { return next(err); }
    res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres });
  });

};

// Handle book create on POST.
exports.book_create_post = [
  // Convert the genre to an array.
  (req, res, next) => {
    if (!(req.body.genre instanceof Array)) {
      if (typeof req.body.genre === 'undefined')
        req.body.genre = [];
      else
        req.body.genre = new Array(req.body.genre);
    }
    next();
  },

  // Validate fields.
  body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
  body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
  body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),

  // Sanitize fields (using wildcard).

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped and trimmed data.
    var book = new Book(
      {
        title: req.body.title,
        author: req.body.author,
        summary: req.body.summary,
        isbn: req.body.isbn,
        genre: req.body.genre
      });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel({
        authors: function (callback) {
          Author.find(callback);
        },
        genres: function (callback) {
          Genre.find(callback);
        },
      }, function (err, results) {
        if (err) { return next(err); }

        // Mark our selected genres as checked.
        for (let i = 0; i < results.genres.length; i++) {
          if (book.genre.indexOf(results.genres[i]._id) > -1) {
            results.genres[i].checked = 'true';
          }
        }
        res.render('book_form', { title: 'Create Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
      });
      return;
    }
    else {
      // Data from form is valid. Save book.
      book.save(function (err) {
        if (err) { return next(err); }
        //successful - redirect to new book record.
        res.redirect(book.url);
      });
    }
  }
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res, next) {
  async.parallel({
    book: callback => Book.findById(req.params.id).exec(callback),
    book_instances: callback => BookInstance.find({ book: req.params.id }).exec(callback)
  }).catch(err => void next(err))
    .then(results => {
      if (results.book === null) {
        return redirect('/catalog/books');
      }
      res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances });
    });
};

// Handle book delete on POST.
exports.book_delete_post = function (req, res, next) {
  async.parallel({
    book: callback => Book.findById(req.params.id).exec(callback),
    book_instances: callback => BookInstance.find({ book: req.params.id }).exec(callback)
  }).catch(err => void next(err))
    .then(results => {
      if (results.book_instances.length > 0) {
        res.render('book_delete', { title: 'Delete Book', book: results.book, book_instances: results.book_instances });
        return;
      }
      Book.findByIdAndRemove(req.body.bookid).exec()
      .catch(err => void next(err))
      .then(_ => void res.redirect('/catalog/books'));
    });
};

// Display book update form on GET.
exports.book_update_get = function (req, res, next) {
  async.parallel({
    book: callback => void Book.findById(req.params.id).exec(callback),
    authors: callback => void Author.find(callback),
    genres: callback => void Genre.find(callback)
  }).catch(err => void next(err))
    .then(results => {
      if (results.book == null) {
        let err = new Error('Book not found');
        err.status = 404;
        return next(err);
      }
      for (let genre of results.genres) {
        genre.checked = results.book.genre.includes(genre._id);
      }
      res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: results.book });
    });
};

// Handle book update on POST.
exports.book_update_post = [
  (req, res, next) => {
    debug("DEBUG, req.body.genre:", req.body.genre);
    if (!(req.body.genre instanceof Array)) {
      req.body.genre = (typeof req.body.genre === 'undefined') ? [] : Array(req.body.genre);
    }
    next();
  },
  body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
  body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
  body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
  body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),
  (req, res, next) => {
    const errors = validationResult(req);
    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
      _id: req.params.id
    });

    if (!errors.isEmpty()) {
      async.parallel({
        authors: callback => void Author.find(callback),
        genres: callback => void Genre.find(callback)
      }).catch(err => void next(err))
        .then(results => {
          for (let genre of results.genres) {
            genre.checked = book.genre.includes(genre._id);
          }
          res.render('book_form', { title: 'Update Book', authors: results.authors, genres: results.genres, book: book, errors: errors.array() });
        });
    }
    Book.findByIdAndUpdate(req.params.id, book)
      .exec()
      .catch(err => void next(err))
      .then(_ => res.redirect(book.url));
  }
];