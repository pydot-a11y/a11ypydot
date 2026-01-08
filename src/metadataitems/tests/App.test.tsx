import { render, screen } from "@testing-library/react";

function ShouldRender() {
  return <h1>Hello World</h1>;
}

test("renders Hello World text", () => {
  render(<ShouldRender />);
  expect(screen.getByText(/hello world/i)).toBeInTheDocument();
});