import { render, screen } from "@testing-library/react";
import { LOUDNESS_DOMAIN, ReferenceScale, scalePosition } from "./ReferenceScale";

describe("ReferenceScale", () => {
  it("places the value proportionally across the domain", () => {
    expect(scalePosition(-17.5, LOUDNESS_DOMAIN).t).toBeCloseTo(0.5);
    render(<ReferenceScale lufs={-17.5} />);
    expect(screen.getByTestId("refscale-value")).toHaveStyle({ left: "50.00%" });
  });

  it("pins out-of-domain values at the edge and says so", () => {
    const { rerender } = render(<ReferenceScale lufs={-40} />);
    expect(screen.getByTestId("refscale-value")).toHaveStyle({ left: "0.00%" });
    expect(screen.getByText("◂ below scale")).toBeInTheDocument();
    rerender(<ReferenceScale lufs={-2} />);
    expect(screen.getByText("above scale ▸")).toBeInTheDocument();
  });

  it("labels references without judging the value", () => {
    render(<ReferenceScale lufs={-9} />);
    expect(screen.getByText("−23 R128")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/−9\.0 LUFS on a scale/);
    expect(screen.queryByText(/too loud|good|bad|pass|fail/i)).not.toBeInTheDocument();
  });
});
