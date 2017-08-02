import http from 'http';
import critical from 'critical';
import fs from 'fs';
import url from 'url';
import path from 'path';
import consoleArguments from './console-arguments';
import chalk from 'chalk';
import {adminBundle} from './admin-bundle.tasks';

// TODO
// - Add more urls
// - Find a way to do this on "secured" pages
// - Compare time for "DOMContenLoaded" (how much did we win?)
// - Where does these .tmp files come from?? Remove the generation of them
// - Add "async" to script tags

// Some issues found:
// 1. Hard to do for secured webpages as we are using a proxy to a php backend (altough if we load the main css in the background on the login page this should be more or less ok as on the second visit the bundle is there)
// 2. Inline option for cricitical css is preferred as it eliminates another http request, this is hard as we need to inject this into the template (twig) and it kinda pollutes the template somewhat
// 3. Loads css files from the file system, doesn't seem to work for dynamic css files
// 4. We cannot rely on the proxy at build time, should create static html for the build to run on which requires manual updates by the developer

// Verified result on 3G good
const PAGES_TO_OPTIMIZE = [
    // css load time takes 230ms after processing with critical before 4.22s (size down to 5KB, from 200kb)
    {
        url: `${consoleArguments.backendProxy}en/admin/login`,
        targetFileName: 'login.html',
        distPath: adminBundle.config.distPath,
        virtualPath: adminBundle.config.publicPath + '/'
    }
];
const CSS_REGEX = /(<link\s+rel=\"(stylesheet|preload)\"\s+href=\").*(css\/.*\.css.*\"\s?(>|\/>))/gmi;

const getTargetPath = (item, optimized = false) => {
    const {url: itemUrl, distPath} = item;
    return distPath + (optimized ? getOptimizedFileName(item) : item.targetFileName);
};

const getOptimizedFileName = item => `${path.basename(item.targetFileName, '.html')}-optimized.html`;

// Create target dir if it doesn't exist
const createTargetDir = (targetDir, done) => {
    fs.stat(targetDir, (err, stats) => {
        if (err || !stats.isDirectory()) {
            fs.mkdir(targetDir, done);
            return;
        }
        done();
    });
};

const getStaticHtml = (item, done) => {
    const {url: itemUrl, distPath} = item;
    http.get(itemUrl, res => {
        res.on('data', chunk => {
            const data = chunk.toString();
            const targetPath = getTargetPath(item);
            const targetDir = path.dirname(targetPath);
            createTargetDir(targetDir, err => {
                if (err) {
                    done(err);
                    return;
                }
                fs.writeFile(getTargetPath(item), data, done);
            });
        });
    });
};

const updateCssPathsInGeneratedHtml = (item, done) => {

    const staticHtmlPath = getTargetPath(item, true);
    fs.readFile(staticHtmlPath, (err, originalData) => {
        // Change urls inside styles to use virtual path again
        let data = originalData.toString().replace(CSS_REGEX, `$1${item.virtualPath}$3`);

        // Mark "script" tags as async (which have .bundle.js)
        // TODO
        fs.writeFile(staticHtmlPath, data, done);
    });
};

const extractCriticalCss = (item, done) => {
    const distPath = item.distPath;
    const urlToCheck = item.url;

    const staticHtmlPath = getTargetPath(item);
    fs.readFile(staticHtmlPath, (err, originalData) => {
        if (err) {
            done(err);
            return;
        }

        const data = originalData.toString().replace(CSS_REGEX, `$1${distPath}$3`);

        critical.generate({
            inline: true,
            base: '.',
            dest: distPath + getOptimizedFileName(item),
            html: data,
            minify: true,
            width: 1024,
            height: 800
        }, (err, output) => {
            if (err) {
                console.log(err);
                done(err);
                return;
            }

            // Update css paths again to use url format
            updateCssPathsInGeneratedHtml(item, done);
        });
    });
};

export function generateStaticHtml(done) {
    let itemsProcessed = 0;
    let hasError = false;
    for (const itemToCheck of PAGES_TO_OPTIMIZE) {
        console.log(chalk.blue('Generating static html for '), chalk.yellow(itemToCheck.url));
        getStaticHtml(itemToCheck, err => {
            itemsProcessed++;
            if (err) {
                console.log(chalk.red(err.message));
                hasError = true;
            }
            if (itemsProcessed === PAGES_TO_OPTIMIZE.length) {
                done(hasError ? new Error('Generating static html failed') : undefined);
            }
        });
    }
};

export function splitCriticalCss(done) {
    let itemsProcessed = 0;
    let hasError = false;
    for (const itemToCheck of PAGES_TO_OPTIMIZE) {
        console.log(chalk.blue('Generating critical css for '), chalk.yellow(itemToCheck.url));
        extractCriticalCss(itemToCheck, err => {
            itemsProcessed++;
            if (err) {
                console.log(chalk.red(err.message));
                hasError = true;
            }
            if (itemsProcessed === PAGES_TO_OPTIMIZE.length) {
                done(hasError ? new Error('Generating critical css failed') : undefined);
            }
        });
    }
};
