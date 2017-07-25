/* eslint-env node */

import gulp from 'gulp';
import webpack from 'webpack';

import consoleArguments from './console-arguments';

import createEslintTask from './tasks/eslint';
import createStylelintTask from './tasks/stylelint';
import createCleanTask from './tasks/clean';
import createCopyTask from './tasks/copy';
import {createCssLocalTask, createCssOptimizedTask} from './tasks/css';
import createBundleTask from './tasks/bundle';
import createServerTask from './tasks/server';
import createHologramTask from './tasks/hologram';
import webpackConfigApp from './config/webpack.config.app';
import webpackConfigAdminExtra from './config/webpack.config.admin-extra';

export const eslint = createEslintTask({
    src: './src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/js/**/*.js',
    failAfterError: !consoleArguments.continueAfterTestError
});

export const stylelint = createStylelintTask({src: './src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/scss/**/*.scss'});

export const clean = createCleanTask({target: ['./web/frontend']});

export const copy = gulp.parallel(
    createCopyTask({src: ['./src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/img/**'], dest: './web/frontend/img'}),
{% if demosite %}
    createCopyTask({src: ['./src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/files/**'], dest: './web/frontend/files'}),
{% endif %}
    createCopyTask({src: ['./src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/fonts/**'], dest: './web/frontend/fonts'})
);

export const cssLocal = createCssLocalTask({src: './src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/scss/style.scss', dest: './web/frontend/css'});

export const cssOptimized = createCssOptimizedTask({src: './src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/scss/*.scss', dest: './web/frontend/css'});

export const bundleLocal = createBundleTask({
    config: webpackConfigApp(consoleArguments.speedupLocalDevelopment)
});

export const bundleOptimized = createBundleTask({
    config: webpackConfigApp(consoleArguments.speedupLocalDevelopment, true),
    logStats: true
});

export const bundleAdminExtraLocal = createBundleTask({
    config: webpackConfigAdminExtra(consoleArguments.speedupLocalDevelopment)
});

export const bundleAdminExtraOptimized = createBundleTask({
    config: webpackConfigAdminExtra(consoleArguments.speedupLocalDevelopment, true)
});

export const server = createServerTask([
    webpackConfigApp(consoleArguments.speedupLocalDevelopment),
    webpackConfigAdminExtra(consoleArguments.speedupLocalDevelopment)
]);

export const hologram = createHologramTask({cwd: 'src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/styleguide'});

export function buildOnChange(done) {
    gulp.watch('./src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/scss/**/*.scss', cssLocal);
    done();
}

export function testOnChange(done) {
    gulp.watch('./src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/js/**/*.js', eslint);
    gulp.watch('./src/{{ bundle.namespace|replace({'\\':'/'}) }}/Resources/ui/scss/**/*.scss', stylelint);
    done();
}
