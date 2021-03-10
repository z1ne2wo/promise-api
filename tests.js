const promisesAplusTests = require("promises-aplus-tests");
const {Promise} = require('.');

const Adapter = {
  deferred: () => {
      const object = {};

      object.promise = new Promise((resolve, reject) => {
          object.resolve = resolve;
          object.reject = reject;
      });

      return object;
  }
};

promisesAplusTests(Adapter);
