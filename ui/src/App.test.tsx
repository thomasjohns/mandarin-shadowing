import { screen } from "@testing-library/react"
import { render } from "./test-utils"
import { App } from "./App"

test("renders learn react link", () => {
  render(<App />)
  // FIXME
  const helloElement = screen.getByText(/Hello World/i)
  expect(helloElement).toBeInTheDocument()
})
