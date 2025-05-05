// gulp config for generating code from MarkLogic data service

import gulp from 'gulp'
import { generate } from 'marklogic/lib/proxy-generator.js'
import rename from 'gulp-rename'

function proxygen() {
  gulp
    .src('../lux-marklogic/src/main/ml-modules/root/ds/lux')
    .pipe(generate())
    .pipe(rename({ extname: '.cjs' }))
    .pipe(gulp.dest('lib/ml-generated'))
  return gulp
    .src('../lux-marklogic/src/main/ml-modules/root/ds/lux/document')
    .pipe(generate())
    .pipe(rename({ extname: '.cjs' }))
    .pipe(gulp.dest('lib/ml-generated'))
}

export { proxygen }
