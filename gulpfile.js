// gulp config for generating code from MarkLogic data service

const gulp = require('gulp')
const proxy = require('marklogic/lib/proxy-generator')

function proxygen() {
  return gulp
    .src('../lux-marklogic/src/main/ml-modules/base/root/ds/*')
    .pipe(proxy.generate())
    .pipe(gulp.dest('lib/ml-generated'))
}

exports.proxygen = proxygen
