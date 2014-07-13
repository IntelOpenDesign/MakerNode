var gulp = require('gulp');
var todo = require('gulp-todo');

gulp.task('todo', function() {
   gulp.src('lib/**/*.js')
        .pipe(todo())
        .pipe(gulp.dest('./'));
    gulp.src('client/static/js/app.js')
        .pipe(todo())
        .pipe(gulp.dest('./client/'));
});

gulp.task('default', ['todo']);
