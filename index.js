#!/usr/bin/env node

const { nanoid } = require('nanoid')
const axios = require('axios')
const ora = require('ora')

let testUrl

try {
  testUrl = new URL(process.argv[2])
} catch (error) {
  console.log(`${testUrl}, Invalid URL, please try again`)
  process.exit(1)
}

const request = axios.create({
  baseURL: 'https://www.googleapis.com/pagespeedonline/',
  timeout: 60 * 1000,
  params: {
    key: 'AIzaSyDmYo75J-gJAbpdacXEunPlsFPg6RKr08E'
  }
})

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const run = () => new Promise((resolve, reject) => {
  testUrl.searchParams.set('psp_id', nanoid())
  request.get('/v5/runPagespeed', {
    params: {
      url: testUrl.toString(),
      strategy: 'MOBILE',
      category: 'PERFORMANCE'
    }
  }).then(({ data }) => {
    resolve({ ...data, url: testUrl.toString() })
  }).catch(error => {
    console.log(error.response.data.error);
    process.exit(1)
  })
})

;(async () => {
  const countNumber = 40
  const eachNumber = 10
  const result = []

  const spinner = ora().start()

  for (const _ of Array(countNumber / eachNumber)) {
    spinner.text = `in the test(${result.length})...`
    const itemResult = (await Promise.all([...Array(eachNumber)].map(_ => run()))).map((data) => {
      const audits = data.lighthouseResult.audits
      const performance = data.lighthouseResult.categories.performance
      return {
        url: data.url,
        score: performance.score * 100,
        FCP: audits['first-contentful-paint'].displayValue,
        LCP: audits['largest-contentful-paint'].displayValue,
        TTI: audits['interactive'].displayValue,
        TBT: audits['total-blocking-time'].displayValue,
        SI: audits['speed-index'].displayValue,
        CLS: audits['cumulative-layout-shift'].displayValue,
      }
    })
    result.push(...itemResult)
    await sleep(1000)
  }

  spinner.stop()

  console.log('result', result)

  // ------------- calc avg ------------- //
  const count = result.length
  let avgScore = 0
  let avgFCP = 0
  let avgLCP = 0
  let avgTTI = 0
  let avgTBT = 0
  let avgSI = 0
  let avgCLS = 0

  result.forEach(({ score, FCP, LCP, TTI, TBT, SI, CLS }) => {
    avgScore += score
    avgFCP += parseFloat(FCP.replace(' s', ''))
    avgLCP += parseFloat(LCP.replace(' s', ''))
    avgLCP += parseFloat(LCP.replace(' s', ''))
    avgTBT += parseFloat(TBT.replace(' ms', ''))
    avgSI += parseFloat(SI.replace(' s', ''))
    avgCLS += parseFloat(CLS.replace(' s', ''))
  })

  avgScore = (avgScore / count).toFixed(1)
  avgFCP = (avgFCP / count).toFixed(1)
  avgLCP = (avgLCP / count).toFixed(1)
  avgTTI = (avgTTI / count).toFixed(1)
  avgTBT = (avgTBT / count).toFixed(1)
  avgSI = (avgSI / count).toFixed(1)
  avgCLS = (avgCLS / count).toFixed(1)

  console.log('testCount', count)
  console.log('avgScore', avgScore)
  console.log('avgFCP', avgFCP)
  console.log('avgLCP', avgLCP)
  console.log('avgTTI', avgTTI)
  console.log('avgTBT', avgTBT)
  console.log('avgSI', avgSI)
  console.log('avgCLS', avgCLS)
})()
