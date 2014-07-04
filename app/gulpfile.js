var gulp = require('gulp');
var todo = require('gulp-todo');

gulp.task('todo', function() {
  gulp.src(['lib/**/*.js', 'client/**/*.js'])
    .pipe(todo())
    .pipe(gulp.dest('./'));
});

gulp.task('default', ['todo']);
