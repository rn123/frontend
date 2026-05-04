import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, state } from "lit/decorators";
import { strokeWidth } from "../../../data/graph";
import { getPath } from "../common/graph/get-path";

export interface HuiGraphGradient {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { offset: number; color: string }[];
}

@customElement("hui-graph-base")
export class HuiGraphBase extends LitElement {
  @property({ attribute: false }) public coordinates?: number[][];

  @property({ attribute: "y-axis-origin", type: Number })
  public yAxisOrigin?: number;

  @property({ attribute: false }) public gradient?: HuiGraphGradient;

  @state() private _path?: string;

  private _uniqueId = `graph-${Math.random().toString(36).substring(2, 9)}`;

  protected render(): TemplateResult {
    const width = this.clientWidth || 500;
    const height = this.clientHeight || width / 5;
    const yAxisOrigin = this.yAxisOrigin ?? height;
    const lastX = this.coordinates?.length
      ? this.coordinates[this.coordinates.length - 1][0]
      : width;
    const fill = this.gradient
      ? `url(#${this._uniqueId}-gradient)`
      : "var(--accent-color)";
    return html`
      ${this._path
        ? svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          ${
            this.gradient
              ? svg`<defs>
                  <linearGradient
                    id="${this._uniqueId}-gradient"
                    gradientUnits="userSpaceOnUse"
                    x1=${this.gradient.x1} y1=${this.gradient.y1}
                    x2=${this.gradient.x2} y2=${this.gradient.y2}
                  >
                    ${this.gradient.stops.map(
                      (s) =>
                        svg`<stop offset=${s.offset} style="stop-color: ${s.color}"></stop>`
                    )}
                  </linearGradient>
                </defs>`
              : nothing
          }
          <g>
            <mask id="${this._uniqueId}-fill">
              <path
                class='fill'
                fill='white'
                d="${this._path} L ${lastX}, ${yAxisOrigin} L 0, ${yAxisOrigin} z"
              />
            </mask>
            <rect height="100%" width="100%" fill=${fill} mask="url(#${this._uniqueId}-fill)"></rect>
            <mask id="${this._uniqueId}-line">
              <path
                vector-effect="non-scaling-stroke"
                class='line'
                fill="none"
                stroke="white"
                stroke-width="${strokeWidth}"
                stroke-linecap="round"
                stroke-linejoin="round"
                d=${this._path}
              ></path>
            </mask>
            <rect height="100%" width="100%" fill=${fill} mask="url(#${this._uniqueId}-line)"></rect>
          </g>
        </svg>`
        : svg`<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}"></svg>`}
    `;
  }

  public willUpdate(changedProps: PropertyValues<this>) {
    if (!this.coordinates) {
      return;
    }

    if (changedProps.has("coordinates")) {
      this._path = getPath(this.coordinates);
    }
  }

  static styles = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }
    .line {
      opacity: 0.8;
    }
    .fill {
      opacity: 0.1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-graph-base": HuiGraphBase;
  }
}
