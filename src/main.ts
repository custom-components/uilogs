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
import "@material/mwc-select/mwc-select";
import "@material/mwc-list/mwc-list-item";
import "@ludeeus/colorlog";

@customElement("ui-logs")
export class UiLogs extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property() private _HALogs?: string;
  @property() private _SupervisorLogs?: string;
  @property() private _AddonLogs?: string;
  @property() private _selected: "ha" | "supervisor" | "addon" = "ha";
  @property() private _addons?: Object[];
  @query("#log") private _logElement?: HTMLElement;

  private async _getAddons(): Promise<void> {
    const response = await this.hass.callApi("GET", `hassio/addons`);
    this._addons = (response as any).data.addons;
  }

  private async _setLogsHA(): Promise<void> {
    this._HALogs = await this.hass.callApi<string>("GET", `error_log`);
  }

  private async _setLogsSupervisor(): Promise<void> {
    this._SupervisorLogs = await this.hass.callApi<string>(
      "GET",
      "hassio/supervisor/logs"
    );
  }

  private async _setLogsAddon(slug: string): Promise<void> {
    this._AddonLogs = await this.hass.callApi(
      "GET",
      `hassio/addons/${slug}/logs`
    );
  }

  private async _reload() {
    if (this._selected === "ha") await this._setLogsHA();
    else if (this._selected === "supervisor") await this._setLogsSupervisor();
    else if (this._selected === "addon") await this._getAddons();
    this._logElement?.scrollIntoView({ block: "end", behavior: "smooth" });
  }

  private async _ChangeTabAction(tab: "ha" | "supervisor" | "addon") {
    this._selected = tab;
    window.scrollTo(0, 0);
    if (this._selected === "ha") await this._setLogsHA();
    else if (this._selected === "supervisor") await this._setLogsSupervisor();
    else if (this._selected === "addon") await this._getAddons();
  }

  async firstUpdated(changedProperties) {
    super.firstUpdated(changedProperties);
    await this._ChangeTabAction("ha");
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
            @click=${() => this._ChangeTabAction("ha")}
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
                  @click=${() => this._ChangeTabAction("supervisor")}
                >
                  Supervisor
                </div>
                <div
                  class=${classMap({
                    "toolbar-button": true,
                    selected: this._selected === "addon"
                  })}
                  @click=${() => this._ChangeTabAction("addon")}
                >
                  Addons
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
          : this._selected === "supervisor"
          ? html`
              <div class="ha-log log" id="log">
                <color-log
                  .log=${this._SupervisorLogs?.replace(/\\[\d*\w/g, "") || ""}
                ></color-log>
              </div>
            `
          : html`
              <div class="ha-log log" id="log">
                <mwc-select outlined label="Addon">
                  <mwc-list-item selected value="" selected></mwc-list-item>
                  ${this._addons?.map(addon => {
                    if ((addon as any).installed) {
                      return html`
                        <mwc-list-item
                          @click=${() =>
                            this._setLogsAddon((addon as any).slug)}
                          >${(addon as any).name}</mwc-list-item
                        >
                      `;
                    }
                    return;
                  })}
                </mwc-select>
                <color-log
                  .log=${this._AddonLogs?.replace(/\\[\d*\w/g, "") || ""}
                ></color-log>
              </div>
            `}
      </div>
    `;
  }

  static get styles() {
    return css`
      mwc-select {
        width: calc(100% - 16px);
        margin: 8px;
        --mdc-theme-primary: var(--primary-color);
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
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
