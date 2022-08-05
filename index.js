#!/usr/bin/env node

const axios = require('axios')
const ora = require('ora')
const { green, yellow, red } = require('kolorist')

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

let runCount = 0

const run = () => new Promise((resolve, reject) => {
  const pspId = Date.now().toString() + runCount++
  testUrl.searchParams.set('psp_id', pspId)
  const url = testUrl.toString()
  request.get('/v5/runPagespeed', {
    params: {
      url,
      strategy: 'MOBILE',
      category: 'PERFORMANCE'
    }
  }).then(({ data }) => {
    resolve({ ...data, url })
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
    spinner.text = `Running(${result.length + eachNumber})...`
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
    avgTTI += parseFloat(TTI.replace(' s', ''))
    avgTBT += parseFloat(TBT.replace(' ms', ''))
    avgSI += parseFloat(SI.replace(' s', ''))
    avgCLS += parseFloat(CLS)
  })

  avgScore = avgScore / count
  avgFCP = avgFCP / count
  avgLCP = avgLCP / count
  avgTTI = avgTTI / count
  avgTBT = avgTBT / count
  avgSI = avgSI / count
  avgCLS = avgCLS / count

  // ------------- output avg ------------- //
  const avgScoreStr = (() => {
    let color = red
    if (avgScore >= 50) color = yellow
    if (avgScore >= 70) color = green
    return color(avgScore.toFixed(1))
  })()
  const avgFCPStr = (() => {
    let color = red
    if (avgTBT <= 3) color = yellow
    if (avgTBT <= 1.8) color = green
    return color(avgFCP.toFixed(1) + 's')
  })()
  const avgLCPStr = (() => {
    let color = red
    if (avgTBT <= 4) color = yellow
    if (avgTBT <= 2.5) color = green
    return color(avgLCP.toFixed(1) + 's')
  })()
  const avgTTIStr = (() => {
    let color = red
    if (avgTBT <= 7.3) color = yellow
    if (avgTBT <= 3.8) color = green
    return color(avgTTI.toFixed(1) + 's')
  })()
  const avgTBTStr = (() => {
    let color = red
    if (avgTBT <= 600) color = yellow
    if (avgTBT <= 200) color = green
    return color(avgTBT.toFixed(1) + 'ms')
  })()
  const avgSIStr = (() => {
    let color = red
    if (avgTBT <= 5.8) color = yellow
    if (avgTBT <= 3.4) color = green
    return color(avgSI.toFixed(1) + 's')
  })()
  const avgCLSStr = avgSI.toFixed(1)

  console.log()
  console.log('AvgScore', avgScoreStr)
  console.log('AvgFCP', avgFCPStr)
  console.log('AvgLCP', avgLCPStr)
  console.log('AvgTTI', avgTTIStr)
  console.log('AvgTBT', avgTBTStr)
  console.log('AvgSI', avgSIStr)
  console.log('AvgCLS', avgCLSStr)
  console.log()
})()
