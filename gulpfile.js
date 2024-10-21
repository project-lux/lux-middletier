// gulp config for generating code from MarkLogic data service

import gulp from 'gulp'
import proxy from 'marklogic/lib/proxy-generator'

function proxygen() {
  return gulp
    .src('../lux-marklogic/src/main/ml-modules/root/ds/*')
    .pipe(proxy.generate())
    .pipe(gulp.dest('lib/ml-generated'))
}

export default proxygen
