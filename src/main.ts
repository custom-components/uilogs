import {
  LitElement,
  customElement,
  property,
  html,
  css,
  query,
  TemplateResult
} from "lit-element";
import { HomeAssistant } from "custom-card-helpers";
import { classMap } from "lit-html/directives/class-map";
import "@ludeeus/colorlog";

@customElement("ui-logs")
export class UiLogs extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property() private _HALogs?: string;
  @property() private _SupervisorLogs?: string;
  @property() private _selected: "ha" | "supervisor" = "ha";
  @query("#log") private _logElement?: HTMLElement;

  private async _getLogs() {
    this._HALogs = await this.hass.callApi<string>("GET", `error_log`);
    if (this.hass.config.components.includes("hassio")) {
      this._SupervisorLogs = await this.hass.callApi<string>(
        "GET",
        "hassio/supervisor/logs"
      );
    }
  }

  private async _reload() {
    await this._getLogs();
    this._logElement?.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  private _changeTab(tab: "ha" | "supervisor") {
    this._selected = tab;
    window.scrollTo(0, 0);
  }

  async firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    await this._getLogs();
  }

  protected render(): TemplateResult | void {
    return html`
      <div class="main">
        <div class="toolbar">
          <div
            class=${classMap({
              "toolbar-button": true,
              selected: this._selected === "ha"
            })}
            @click=${() => this._changeTab("ha")}
          >
            Home Assistant
          </div>
          ${this.hass.config.components.includes("hassio")
            ? html`
                <div
                  class=${classMap({
                    "toolbar-button": true,
                    selected: this._selected === "supervisor"
                  })}
                  @click=${() => this._changeTab("supervisor")}
                >
                  Supervisor
                </div>
              `
            : ""}
          <span class="reload" title="reload" @click=${this._reload}
            >&#x21bb;</span
          >
        </div>
        ${this._selected === "ha"
          ? html`
              <div class="ha-log log" id="log">
                <color-log .log=${this._HALogs || ""}></color-log>
              </div>
            `
          : html`
              <div class="ha-log log" id="log">
                <color-log
                  .log=${this._SupervisorLogs?.replace(/\\[\d*\w/g, "") || ""}
                ></color-log>
              </div>
            `}
      </div>
    `;
  }

  static get styles() {
    return css`
      .log {
        margin: 8px;
        margin-top: 73px;
        padding: 4px;
        position: relative;
        background: var(
          --ha-card-background,
          var(--paper-card-background-color, white)
        );
        border-radius: var(--ha-card-border-radius, 2px);
        box-shadow: var(
          --ha-card-box-shadow,
          0 2px 2px 0 rgba(0, 0, 0, 0.14),
          0 1px 5px 0 rgba(0, 0, 0, 0.12),
          0 3px 1px -2px rgba(0, 0, 0, 0.2)
        );
        color: var(--primary-text-color);
        display: block;
        transition: all 0.3s ease-out;
      }
      color-log {
        --colorlog-text: var(--primary-text-color);
      }
      .main {
        background-color: var(--primary-background-color);
        color: var(--primary-text-color);
        padding: 1px;
      }
      .toolbar {
        display: flex;
        position: fixed;
        z-index: 1;
        width: 100%;
        top: 0;
        height: 65px;
        background-color: var(--app-header-background-color);
        color: var(--text-primary-color);
      }
      .toolbar-button {
        z-index: 2;
        font-size: x-large;
        margin: 38px 32px 0 32px;
        cursor: pointer;
      }
      .selected {
        text-decoration: underline;
      }
      .reload {
        z-index: 2;
        font-family: Lucida Sans Unicode;
        font-size: xx-large;
        position: fixed;
        right: 8px;
        top: 8px;
        cursor: pointer;
      }
    `;
  }
}
