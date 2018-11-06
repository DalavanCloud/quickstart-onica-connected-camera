'use strict';

const handler = require('../../handler.js');
const chai = require('chai');
const expect = chai.expect;
var event, context;


describe('Stack Availability', function () {
  it('verifies successful response', async () => {
    const result = await handler.getStackAvailability(event, context)
    expect(result).to.be.an('object')
    expect(result.statusCode).to.equal(200)
    const body = JSON.parse(result.body)
    expect(body.available).to.be.true
  })
})
