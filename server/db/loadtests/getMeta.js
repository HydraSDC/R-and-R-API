import { sleep, check } from "k6";
import http from "k6/http";

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200']
  }
};

export default function getMeta() {
  let response;

  // get
  response = http.get("http://localhost:1234/reviews/meta");
  check(response, {
    "status equals 200": response => response.status.toString() === "200",
    "transaction time < 2000ms": response => response.timings.duration < 2000,
  })
}