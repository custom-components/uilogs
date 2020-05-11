import {
  LitElement,
  customElement,
  property,
  html,
  css,
  query,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "custom-card-helpers";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-select/mwc-select";
import "@ludeeus/colorlog";

@customElement("ui-logs")
export class UiLogs extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;
  @property() private _HALogs?: string;
  @property() private _SupervisorLogs?: string;
  @property() private _AddonLogs?: string;
  @property() private _Filter: string = "";
  @property() private _selected: "ha" | "supervisor" | "addon" = "ha";
  @property() private _Addon?: string;
  @property() private _addons?: Object[];
  @query("#log") private _logElement?: HTMLElement;
  @query("#search-input") private _filterInput?: any;

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
    this._Addon = slug;
    await this._getAdonLog();
  }

  private async _getAdonLog(): Promise<void> {
    if (!this._Addon) return;
    this._AddonLogs = await this.hass.callApi(
      "GET",
      `hassio/addons/${this._Addon}/logs`
    );
  }

  private async _reload() {
    if (this._selected === "ha") await this._setLogsHA();
    else if (this._selected === "supervisor") await this._setLogsSupervisor();
    else if (this._selected === "addon") await this._getAdonLog();
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

  _filterLogs(logs: string): string {
    if (!this._Filter) return logs;
    let filteredLogs: (string | undefined)[];

    filteredLogs = logs.split("\n").map((line) => {
      if (line.toLowerCase().includes(String(this._Filter).toLowerCase())) {
        return line;
      }
      return;
    });

    return filteredLogs.join("\n");
  }

  protected render(): TemplateResult | void {
    return html`
      <div class="main">
        <div class="toolbar">
          <div id="tabbar">
            <div
              class="${this._selected === "ha"
                ? "toolbar-button selected"
                : "toolbar-button"}"
              @click=${() => this._ChangeTabAction("ha")}
            >
              Core
            </div>
            ${this.hass.config.components.includes("hassio")
              ? html`
                  <div
                    class="toolbar-button ${this._selected === "supervisor"
                      ? "toolbar-button selected"
                      : "toolbar-button"}"
                    @click=${() => this._ChangeTabAction("supervisor")}
                  >
                    Supervisor
                  </div>
                  <div
                    class="toolbar-button ${this._selected === "addon"
                      ? "toolbar-button selected"
                      : "toolbar-button"}"
                    @click=${() => this._ChangeTabAction("addon")}
                  >
                    Addons
                  </div>
                `
              : ""}
          </div>
          <div id="toolbar-icon">
            <ha-icon-button
              icon="mdi:reload"
              role="button"
              @click=${this._reload}
            ></ha-icon-button>
          </div>
        </div>
        <div class="searchbar">
          <ha-icon icon="mdi:magnify" role="button"></ha-icon>
          <input
            id="search-input"
            class="search-input"
            placeholder="Filter logs"
            .value=${this._Filter}
            @input=${this._filterInputChanged}
          />
          ${this._Filter
            ? html`
                <ha-icon-button
                  icon="mdi:close"
                  role="button"
                  @click=${this._clearFilter}
                ></ha-icon-button>
              `
            : ""}
        </div>
        <div class="content">
          ${this._selected === "ha"
            ? html`
                <div class="ha-log log" id="log">
                  <color-log
                    .log=${this._filterLogs(this._HALogs || "")}
                  ></color-log>
                </div>
              `
            : this._selected === "supervisor"
            ? html`
                <div class="ha-log log" id="log">
                  <color-log
                    .log=${this._filterLogs(
                      this._SupervisorLogs?.replace(/\\[\d*\w/g, "") || ""
                    )}
                  ></color-log>
                </div>
              `
            : html`
                <div class="ha-log log" id="log">
                  <mwc-select outlined label="Addon">
                    <mwc-list-item selected value="" selected></mwc-list-item>
                    ${this._addons?.map((addon) => {
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
                    .log=${this._filterLogs(
                      this._AddonLogs?.replace(/\\[\d*\w/g, "") || ""
                    )}
                  ></color-log>
                </div>
              `}
        </div>
      </div>
    `;
  }

  private _clearFilter() {
    this._Filter = "";
  }

  private _filterInputChanged() {
    this._Filter = this._filterInput?.value;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
        background-color: var(--primary-background-color);
      }
      ha-menu-button {
        margin-right: 24px;
      }
      .toolbar {
        display: flex;
        align-items: center;
        font-size: 20px;
        height: 65px;
        background-color: var(--sidebar-background-color);
        font-weight: 400;
        color: var(--sidebar-text-color);
        border-bottom: 1px solid var(--divider-color);
        font-family: var(--paper-font-body1_-_font-family);
        padding: 0 16px;
        box-sizing: border-box;
      }
      .searchbar {
        display: flex;
        align-items: center;
        font-size: 20px;
        top: 65px;
        height: 65px;
        background-color: var(--sidebar-background-color);
        border-bottom: 1px solid var(--divider-color);
        padding: 0 16px;
        box-sizing: border-box;
      }
      #tabbar {
        display: flex;
        font-size: 14px;
        flex: 1;
        justify-content: center;
      }

      :host(:not([narrow])) #toolbar-icon {
        min-width: 40px;
      }

      .content {
        position: absolute;
        width: 100%;
        height: calc(100% - 65px - 65px);
        overflow-y: auto;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
      }
      :host([narrow]) .content {
        height: calc(100% - 128px);
      }
      mwc-select {
        width: calc(100% - 16px);
        margin: 8px;
        --mdc-theme-primary: var(--primary-color);
        --mdc-theme-text-primary-on-background: var(--primary-text-color);
      }
      .log {
        margin: 8px;
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

      .reload {
        z-index: 2;
        position: fixed;
        right: 8px;
        top: 8px;
      }

      .toolbar-button {
        padding: 0 32px;
        display: flex;
        flex-direction: column;
        text-align: center;
        align-items: center;
        justify-content: center;
        height: 64px;
        cursor: pointer;
        position: relative;
        outline: none;
        box-sizing: border-box;
      }
      .name {
        white-space: nowrap;
      }
      ha-icon-button {
        cursor: pointer;
      }
      .selected {
        color: var(--primary-color);
        border-bottom: 2px solid var(--primary-color);
      }
      .search-input {
        width: calc(100% - 48px);
        height: 40px;
        border: 0;
        padding: 0 16px;
        font-size: initial;
        color: var(--sidebar-text-color);
        font-family: var(--paper-font-body1_-_font-family);
      }
      input:focus {
        outline-offset: 0;
        outline: 0;
      }
    `;
  }
}
