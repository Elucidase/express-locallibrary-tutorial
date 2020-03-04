const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');

const { body, validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res) {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) { return next(err); }
      // Successful, so render
      res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstances });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) { return next(err); }
      if (bookinstance == null) { // No results.
        var err = new Error('Book copy not found');
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render('bookinstance_detail', { title: 'Copy: ' + bookinstance.book.title, bookinstance: bookinstance });
    })
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  Book.find()
    .exec()
    .catch(err => next(err))
    .then(books => {
      res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books });
    })
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  body('book').trim().isLength({ min: 1 }),
  body('imprint').trim().isLength({ min: 1 }),
  body('due_back').optional({ checkFalsy: true }).isISO8601(),
  sanitizeBody('status').trim(),
  sanitizeBody('due_back').toDate(),
  (req, res, next) => {
    const errors = validationResult(req);
    const bookinstance = new BookInstance({
      book: req.body.book,
      imprint: req.body.imprint,
      status: req.body.status,
      due_back: req.body.due_back
    });

    if (!errors.isEmpty()) {
      Book.find()
        .exec()
        .catch(err => next(err))
        .then(books => {
          return res.render('bookinstance_form', {
            title: 'Create BookInstance',
            book_list: books,
            selected_book: bookInstance.book._id,
            errors: errors,
            bookinstance: bookinstance
          });
        });
    }
    bookinstance.save()
      .catch(err => next(err))
      .then(_ => res.redirect(bookinstance.url));
  }
]

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res) {
  res.send('NOT IMPLEMENTED: BookInstance delete GET');
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res) {
  res.send('NOT IMPLEMENTED: BookInstance delete POST');
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res) {
  res.send('NOT IMPLEMENTED: BookInstance update GET');
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = function (req, res) {
  res.send('NOT IMPLEMENTED: BookInstance update POST');
};